import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../../../../shared/application/context/tenant-context.vo';
import { CustomerId } from '../../../domain/value-objects/customer-id.vo';
import { CustomerName } from '../../../domain/value-objects/customer-name.vo';
import { OrganizationSettings } from '../../../domain/value-objects/organization-settings.vo';
import { Customer } from '../../../domain/entities/customer.entity';
import { CustomerRepository } from '../persistence/customer.repository';
import { TenantScopedLoggingService } from '../../../../shared/infrastructure/logging/tenant-scoped-logging.service';
import { tenantPrisma } from '../../../../../tenant-middleware';

/**
 * Service for handling customer onboarding processes
 */
@Injectable()
export class CustomerOnboardingService {
  private prisma: PrismaClient;

  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly loggingService: TenantScopedLoggingService
  ) {
    this.prisma = tenantPrisma.client;
  }

  /**
   * Onboard a new customer with default settings
   * @param name The customer name
   * @param adminEmail The admin email for the customer
   * @param adminPassword The admin password
   * @param adminContext Admin tenant context with permissions to create customers
   * @returns The ID of the newly created customer
   */
  async onboardNewCustomer(
    name: string,
    adminEmail: string,
    adminPassword: string,
    adminContext: TenantContext
  ): Promise<CustomerId> {
    // Verify admin has permissions to create customers
    if (!adminContext.canBypassTenantRestrictions()) {
      throw new Error('Only SUPERADMIN can onboard new customers');
    }

    this.loggingService.info(
      `Starting onboarding process for new customer: ${name}`,
      adminContext
    );

    try {
      // Create customer ID and entity
      const customerId = CustomerId.create(crypto.randomUUID());
      const customerName = CustomerName.create(name);
      
      // Create default organization settings
      const settings = OrganizationSettings.create(
        10, // maxUsers
        50, // maxDevices
        ['basic_monitoring', 'alerts'], // features
        'default', // theme
        null // customDomain
      );

      // Create customer entity
      const customer = Customer.create(customerId, customerName, settings);

      // Save customer to repository
      await this.customerRepository.save(customer, adminContext);

      // Create admin user for the customer
      await this.createCustomerAdmin(customerId, adminEmail, adminPassword, adminContext);

      // Set up initial resources for the customer
      await this.setupInitialResources(customerId, adminContext);

      this.loggingService.info(
        `Successfully onboarded new customer: ${name} with ID: ${customerId.getValue()}`,
        adminContext
      );

      return customerId;
    } catch (error) {
      this.loggingService.error(
        `Error onboarding customer: ${error.message}`,
        adminContext,
        { error }
      );
      throw error;
    }
  }

  /**
   * Create an admin user for a customer
   * @param customerId The customer ID
   * @param email The admin email
   * @param password The admin password
   * @param adminContext Admin tenant context
   */
  private async createCustomerAdmin(
    customerId: CustomerId,
    email: string,
    password: string,
    adminContext: TenantContext
  ): Promise<void> {
    // Create admin user with ADMIN role for the customer
    await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        password, // In a real implementation, this would be hashed
        role: 'ADMIN',
        customerId: customerId.getValue(),
        name: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    this.loggingService.info(
      `Created admin user (${email}) for customer: ${customerId.getValue()}`,
      adminContext
    );
  }

  /**
   * Set up initial resources for a new customer
   * @param customerId The customer ID
   * @param adminContext Admin tenant context
   */
  private async setupInitialResources(
    customerId: CustomerId,
    adminContext: TenantContext
  ): Promise<void> {
    // Create default API key for the customer
    const apiKey = await this.prisma.apiKey.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Default API Key',
        key: this.generateApiKey(),
        customerId: customerId.getValue(),
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year expiry
      }
    });

    // Create default system configuration
    await this.prisma.systemConfig.create({
      data: {
        id: crypto.randomUUID(),
        key: 'default_alert_threshold',
        value: '80',
        customerId: customerId.getValue(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create welcome notification
    await this.prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        title: 'Welcome to IoT Pilot Server',
        message: 'Thank you for signing up. Get started by adding your first device.',
        read: false,
        customerId: customerId.getValue(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    this.loggingService.info(
      `Set up initial resources for customer: ${customerId.getValue()}`,
      adminContext,
      { apiKeyId: apiKey.id }
    );
  }

  /**
   * Generate a secure API key
   * @returns A secure API key string
   */
  private generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const segments = [16, 16, 16, 16]; // 4 segments of 16 characters
    
    let apiKey = '';
    
    for (const segmentLength of segments) {
      if (apiKey) {
        apiKey += '.';
      }
      
      let segment = '';
      for (let i = 0; i < segmentLength; i++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      apiKey += segment;
    }
    
    return apiKey;
  }

  /**
   * Provision a customer with sample data for demonstration purposes
   * @param customerId The customer ID
   * @param adminContext Admin tenant context
   */
  async provisionDemoData(
    customerId: CustomerId,
    adminContext: TenantContext
  ): Promise<void> {
    // Verify admin has permissions
    if (!adminContext.canBypassTenantRestrictions()) {
      throw new Error('Only SUPERADMIN can provision demo data');
    }

    this.loggingService.info(
      `Provisioning demo data for customer: ${customerId.getValue()}`,
      adminContext
    );

    try {
      // Create sample devices
      const deviceTypes = ['Temperature Sensor', 'Humidity Sensor', 'Pressure Sensor'];
      
      for (let i = 0; i < deviceTypes.length; i++) {
        const deviceId = crypto.randomUUID();
        
        // Create device
        await this.prisma.device.create({
          data: {
            id: deviceId,
            name: `Demo ${deviceTypes[i]}`,
            type: deviceTypes[i],
            status: 'ACTIVE',
            customerId: customerId.getValue(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        // Create sample metrics for the device
        const now = new Date();
        for (let j = 0; j < 10; j++) {
          const timestamp = new Date(now.getTime() - j * 3600000); // 1 hour intervals
          
          await this.prisma.deviceMetric.create({
            data: {
              id: crypto.randomUUID(),
              deviceId,
              customerId: customerId.getValue(),
              name: deviceTypes[i].split(' ')[0].toLowerCase(),
              value: (Math.random() * 100).toFixed(2),
              unit: i === 0 ? '°C' : i === 1 ? '%' : 'hPa',
              timestamp,
              createdAt: timestamp
            }
          });
        }
      }

      this.loggingService.info(
        `Successfully provisioned demo data for customer: ${customerId.getValue()}`,
        adminContext
      );
    } catch (error) {
      this.loggingService.error(
        `Error provisioning demo data: ${error.message}`,
        adminContext,
        { error }
      );
      throw error;
    }
  }
}