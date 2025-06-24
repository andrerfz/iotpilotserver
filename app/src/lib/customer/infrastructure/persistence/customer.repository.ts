import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantRepository } from '../../../../../shared/domain/interfaces/tenant-repository.interface';
import { TenantContext } from '../../../../../shared/application/context/tenant-context.vo';
import { Customer } from '../../../domain/entities/customer.entity';
import { CustomerId } from '../../../domain/value-objects/customer-id.vo';
import { CustomerName } from '../../../domain/value-objects/customer-name.vo';
import { CustomerStatus, CustomerStatusEnum } from '../../../domain/value-objects/customer-status.vo';
import { OrganizationSettings } from '../../../domain/value-objects/organization-settings.vo';
import { tenantPrisma } from '../../../../../tenant-middleware';

@Injectable()
export class CustomerRepository implements TenantRepository<Customer, CustomerId> {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = tenantPrisma.client;
  }

  async findById(id: CustomerId, tenantContext: TenantContext): Promise<Customer | null> {
    const customerData = await this.prisma.customer.findUnique({
      where: { id: id.getValue() }
    });

    if (!customerData) {
      return null;
    }

    return this.mapToDomain(customerData);
  }

  async findAll(tenantContext: TenantContext): Promise<Customer[]> {
    const customers = await this.prisma.customer.findMany();
    return customers.map(customer => this.mapToDomain(customer));
  }

  async save(entity: Customer, tenantContext: TenantContext): Promise<void> {
    await this.prisma.customer.upsert({
      where: { id: entity.getId().getValue() },
      update: this.mapToDatabase(entity),
      create: this.mapToDatabase(entity)
    });
  }

  async delete(id: CustomerId, tenantContext: TenantContext): Promise<void> {
    await this.prisma.customer.delete({
      where: { id: id.getValue() }
    });
  }

  async findByTenant(tenantId: CustomerId): Promise<Customer[]> {
    // For Customer entity, the tenant ID is the customer ID itself
    const customerData = await this.prisma.customer.findUnique({
      where: { id: tenantId.getValue() }
    });

    if (!customerData) {
      return [];
    }

    return [this.mapToDomain(customerData)];
  }

  async countByTenant(tenantId: CustomerId): Promise<number> {
    // For Customer entity, the tenant ID is the customer ID itself
    const count = await this.prisma.customer.count({
      where: { id: tenantId.getValue() }
    });

    return count;
  }

  async existsInTenant(id: CustomerId, tenantId: CustomerId): Promise<boolean> {
    // For Customer entity, we check if the ID matches the tenant ID
    return id.equals(tenantId);
  }

  private mapToDomain(data: any): Customer {
    const id = CustomerId.create(data.id);
    const name = CustomerName.create(data.name);
    const status = new CustomerStatus(data.status as CustomerStatusEnum);
    const settings = OrganizationSettings.create(
      data.settings.maxUsers,
      data.settings.maxDevices,
      data.settings.features,
      data.settings.theme,
      data.settings.customDomain
    );

    const customer = Customer.create(id, name, settings);
    
    // Set the correct status
    if (status.getValue() === CustomerStatusEnum.INACTIVE) {
      customer.deactivate();
    } else if (status.getValue() === CustomerStatusEnum.SUSPENDED) {
      customer.suspend();
    }

    // Clear events to avoid publishing them when loading from DB
    customer.clearEvents();
    
    return customer;
  }

  private mapToDatabase(entity: Customer): any {
    return {
      id: entity.getId().getValue(),
      name: entity.getName().getValue(),
      status: entity.getStatus().getValue(),
      settings: {
        maxUsers: entity.getSettings().getMaxUsers(),
        maxDevices: entity.getSettings().getMaxDevices(),
        features: entity.getSettings().getFeatures(),
        theme: entity.getSettings().getTheme(),
        customDomain: entity.getSettings().getCustomDomain()
      },
      createdAt: entity.getCreatedAt(),
      updatedAt: entity.getUpdatedAt()
    };
  }
}