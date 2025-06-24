import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../../../application/context/tenant-context.vo';
import { CustomerId } from '../../../../customer/domain/value-objects/customer-id.vo';
import { tenantPrisma } from '../../../../../tenant-middleware';
import { TenantScopedLoggingService, LogLevel } from '../logging/tenant-scoped-logging.service';

/**
 * Utility service for handling tenant data migrations
 */
@Injectable()
export class TenantDataMigrationUtils {
  private prisma: PrismaClient;

  constructor(private readonly loggingService: TenantScopedLoggingService) {
    this.prisma = tenantPrisma.client;
  }

  /**
   * Migrate data from one tenant to another
   * @param sourceTenantId The source tenant ID
   * @param targetTenantId The target tenant ID
   * @param entityType The entity type to migrate (e.g., 'user', 'device')
   * @param options Migration options
   * @param adminContext Admin tenant context with permissions to perform migration
   */
  async migrateData(
    sourceTenantId: CustomerId,
    targetTenantId: CustomerId,
    entityType: string,
    options: MigrationOptions,
    adminContext: TenantContext
  ): Promise<MigrationResult> {
    // Verify admin has permissions to perform migration
    if (!adminContext.canBypassTenantRestrictions()) {
      throw new Error('Only SUPERADMIN can perform tenant data migrations');
    }

    this.loggingService.info(
      `Starting migration of ${entityType} data from tenant ${sourceTenantId.getValue()} to ${targetTenantId.getValue()}`,
      adminContext
    );

    try {
      // Validate that both tenants exist
      const sourceExists = await this.tenantExists(sourceTenantId);
      const targetExists = await this.tenantExists(targetTenantId);

      if (!sourceExists || !targetExists) {
        throw new Error('Source or target tenant does not exist');
      }

      // Get data from source tenant
      const sourceData = await this.getEntityDataFromTenant(sourceTenantId, entityType);

      // Apply transformations if needed
      const transformedData = options.transformData 
        ? sourceData.map(options.transformData)
        : sourceData;

      // Add target tenant ID to each record
      const dataForTarget = transformedData.map(item => ({
        ...item,
        customerId: targetTenantId.getValue(),
        id: options.preserveIds ? item.id : this.generateNewId()
      }));

      // Handle existing data in target tenant
      if (options.mergeStrategy === 'replace') {
        await this.deleteExistingData(targetTenantId, entityType);
      }

      // Insert data into target tenant
      const result = await this.insertDataIntoTenant(targetTenantId, entityType, dataForTarget);

      this.loggingService.info(
        `Successfully migrated ${result.migratedCount} ${entityType} records to tenant ${targetTenantId.getValue()}`,
        adminContext,
        { result }
      );

      return result;
    } catch (error) {
      this.loggingService.error(
        `Error migrating ${entityType} data: ${error.message}`,
        adminContext,
        { error }
      );
      throw error;
    }
  }

  /**
   * Clone a tenant's data to create a new tenant
   * @param sourceTenantId The source tenant ID to clone from
   * @param newTenantName The name for the new tenant
   * @param adminContext Admin tenant context with permissions to perform cloning
   */
  async cloneTenant(
    sourceTenantId: CustomerId,
    newTenantName: string,
    adminContext: TenantContext
  ): Promise<CustomerId> {
    // Verify admin has permissions
    if (!adminContext.canBypassTenantRestrictions()) {
      throw new Error('Only SUPERADMIN can clone tenants');
    }

    this.loggingService.info(
      `Starting tenant clone from ${sourceTenantId.getValue()}`,
      adminContext
    );

    try {
      // Get source tenant data
      const sourceTenant = await this.prisma.customer.findUnique({
        where: { id: sourceTenantId.getValue() },
        include: { settings: true }
      });

      if (!sourceTenant) {
        throw new Error('Source tenant does not exist');
      }

      // Create new tenant
      const newTenantId = this.generateNewId();
      await this.prisma.customer.create({
        data: {
          id: newTenantId,
          name: newTenantName,
          status: sourceTenant.status,
          settings: {
            create: {
              ...sourceTenant.settings,
              id: this.generateNewId()
            }
          }
        }
      });

      const newCustomerId = CustomerId.create(newTenantId);

      // Clone entity data for the new tenant
      const entityTypes = ['user', 'device', 'deviceMetric', 'deviceLog', 'alert'];
      
      for (const entityType of entityTypes) {
        await this.migrateData(
          sourceTenantId,
          newCustomerId,
          entityType,
          {
            preserveIds: false,
            mergeStrategy: 'replace',
            transformData: null
          },
          adminContext
        );
      }

      this.loggingService.info(
        `Successfully cloned tenant ${sourceTenantId.getValue()} to new tenant ${newTenantId}`,
        adminContext
      );

      return newCustomerId;
    } catch (error) {
      this.loggingService.error(
        `Error cloning tenant: ${error.message}`,
        adminContext,
        { error }
      );
      throw error;
    }
  }

  /**
   * Check if a tenant exists
   * @param tenantId The tenant ID to check
   * @returns True if the tenant exists, false otherwise
   */
  private async tenantExists(tenantId: CustomerId): Promise<boolean> {
    const count = await this.prisma.customer.count({
      where: { id: tenantId.getValue() }
    });
    return count > 0;
  }

  /**
   * Get entity data from a tenant
   * @param tenantId The tenant ID
   * @param entityType The entity type
   * @returns Array of entity data
   */
  private async getEntityDataFromTenant(tenantId: CustomerId, entityType: string): Promise<any[]> {
    const model = this.getModelForEntityType(entityType);
    return await this.prisma[model].findMany({
      where: { customerId: tenantId.getValue() }
    });
  }

  /**
   * Delete existing data in a tenant
   * @param tenantId The tenant ID
   * @param entityType The entity type
   */
  private async deleteExistingData(tenantId: CustomerId, entityType: string): Promise<void> {
    const model = this.getModelForEntityType(entityType);
    await this.prisma[model].deleteMany({
      where: { customerId: tenantId.getValue() }
    });
  }

  /**
   * Insert data into a tenant
   * @param tenantId The tenant ID
   * @param entityType The entity type
   * @param data The data to insert
   * @returns Migration result
   */
  private async insertDataIntoTenant(
    tenantId: CustomerId,
    entityType: string,
    data: any[]
  ): Promise<MigrationResult> {
    const model = this.getModelForEntityType(entityType);
    
    // Insert data in batches to avoid potential issues with large datasets
    const batchSize = 100;
    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        const result = await this.prisma[model].createMany({
          data: batch,
          skipDuplicates: true
        });
        
        migratedCount += result.count;
      } catch (error) {
        errorCount += batch.length;
        errors.push(error.message);
      }
    }

    return {
      entityType,
      sourceTenantId: data[0]?.customerId,
      targetTenantId: tenantId.getValue(),
      totalCount: data.length,
      migratedCount,
      errorCount,
      errors
    };
  }

  /**
   * Get the Prisma model name for an entity type
   * @param entityType The entity type
   * @returns The Prisma model name
   */
  private getModelForEntityType(entityType: string): string {
    const modelMap: Record<string, string> = {
      'user': 'user',
      'device': 'device',
      'deviceMetric': 'deviceMetric',
      'deviceLog': 'deviceLog',
      'deviceCommand': 'deviceCommand',
      'alert': 'alert',
      'customer': 'customer'
    };

    const model = modelMap[entityType];
    
    if (!model) {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }
    
    return model;
  }

  /**
   * Generate a new UUID
   * @returns A new UUID string
   */
  private generateNewId(): string {
    return crypto.randomUUID();
  }
}

/**
 * Options for data migration
 */
export interface MigrationOptions {
  preserveIds: boolean;
  mergeStrategy: 'merge' | 'replace';
  transformData: ((data: any) => any) | null;
}

/**
 * Result of a data migration
 */
export interface MigrationResult {
  entityType: string;
  sourceTenantId: string;
  targetTenantId: string;
  totalCount: number;
  migratedCount: number;
  errorCount: number;
  errors: string[];
}