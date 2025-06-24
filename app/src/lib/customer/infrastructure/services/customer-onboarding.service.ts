import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { CustomerName } from '@/lib/customer/domain/value-objects/customer-name.vo';
import { OrganizationSettings } from '@/lib/customer/domain/value-objects/organization-settings.vo';
import { Customer } from '@/lib/customer/domain/entities/customer.entity';
import { CustomerRepository } from '../persistence/customer.repository';
import { TenantScopedLoggingService } from '@/lib/shared/infrastructure/logging/tenant-scoped-logging.service';
import { tenantPrisma } from '@/lib/tenant-middleware';

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
      const adminUserId = await this.createCustomerAdmin(customerId, adminEmail, adminPassword, adminContext);

      // Set up initial resources for the customer
      await this.setupInitialResources(customerId, adminUserId, adminContext);

      this.loggingService.info(
        `Successfully onboarded new customer: ${name} with ID: ${customerId.getValue()}`,
        adminContext
      );

      return customerId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggingService.error(
        `Error onboarding customer: ${errorMessage}`,
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
  ): Promise<string> {
    // Create admin user with ADMIN role for the customer
    const userId = crypto.randomUUID();

    await this.prisma.user.create({
      data: {
        id: userId,
        email,
        username: 'admin', // Using username instead of name
        password, // In a real implementation, this would be hashed
        role: 'ADMIN',
        customerId: customerId.getValue()
        // createdAt is handled automatically by Prisma
        // updatedAt is handled automatically by Prisma
      }
    });

    this.loggingService.info(
      `Created admin user (${email}) for customer: ${customerId.getValue()}`,
      adminContext
    );

    return userId;
  }

  /**
   * Set up initial resources for a new customer
   * @param customerId The customer ID
   * @param adminContext Admin tenant context
   */
  private async setupInitialResources(
    customerId: CustomerId,
    userId: string,
    adminContext: TenantContext
  ): Promise<void> {
    // Create default API key for the customer
    const apiKey = await this.prisma.apiKey.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Default API Key',
        key: this.generateApiKey(),
        userId: userId,
        customerId: customerId.getValue(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year expiry
      }
    });

    // Create default system configuration
    await this.prisma.systemConfig.create({
      data: {
        id: crypto.randomUUID(),
        key: `customer_${customerId.getValue()}_default_alert_threshold`,
        value: '80',
        category: 'CUSTOMER_SETTINGS'
      }
    });

    // Create welcome notification
    // Note: Notification model doesn't exist in the Prisma schema
    // Commenting out this code until the Notification model is added to the schema
    /*
    await this.prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        title: 'Welcome to IoT Pilot Server',
        message: 'Thank you for signing up. Get started by adding your first device.',
        read: false,
        customerId: customerId.getValue()
      }
    });
    */

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
            deviceId: `demo-device-${i}`,
            hostname: `Demo-${deviceTypes[i]}`,
            deviceType: 'GENERIC',
            architecture: 'arm64',
            status: 'ONLINE',
            customerId: customerId.getValue()
          }
        });

        // Create sample metrics for the device
        const now = new Date();
        for (let j = 0; j < 10; j++) {
          const timestamp = new Date(now.getTime() - j * 3600000); // 1 hour intervals

          await this.prisma.deviceMetric.create({
            data: {
              id: crypto.randomUUID(),
              deviceId, // This links to the device, which is already associated with the customer
              metric: deviceTypes[i].split(' ')[0].toLowerCase(), // Using 'metric' field instead of 'name'
              value: parseFloat((Math.random() * 100).toFixed(2)), // Convert to Float
              unit: i === 0 ? '°C' : i === 1 ? '%' : 'hPa',
              timestamp
              // createdAt is handled automatically by Prisma
            }
          });
        }
      }

      this.loggingService.info(
        `Successfully provisioned demo data for customer: ${customerId.getValue()}`,
        adminContext
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggingService.error(
        `Error provisioning demo data: ${errorMessage}`,
        adminContext,
        { error }
      );
      throw error;
    }
  }
}
