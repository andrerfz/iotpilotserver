import { Injectable } from '@nestjs/common';
import { QueryHandler } from '@/lib/shared/application/interfaces/query.interface';
import { GetCustomerSettingsQuery } from './get-customer-settings.query';
import { TenantRepository } from '@/lib/shared/domain/interfaces/tenant-repository.interface';
import { Customer } from '@/lib/customer/domain/entities/customer.entity';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { OrganizationSettings } from '@/lib/customer/domain/value-objects/organization-settings.vo';
import { CustomerValidator } from '@/lib/customer/domain/services/customer-validator.service';
import { OrganizationManager } from '@/lib/customer/domain/services/organization-manager.service';
import { TenantIsolationEnforcer } from '@/lib/customer/domain/services/tenant-isolation-enforcer.service';
import { TenantAccessDeniedException } from '@/lib/shared/domain/exceptions/tenant.exception';

@Injectable()
export class GetCustomerSettingsHandler implements QueryHandler<GetCustomerSettingsQuery, OrganizationSettings | null> {
  constructor(
    private readonly customerRepository: TenantRepository<Customer, CustomerId>,
    private readonly customerValidator: CustomerValidator,
    private readonly organizationManager: OrganizationManager,
    private readonly tenantIsolationEnforcer: TenantIsolationEnforcer
  ) {}

  /**
   * Handles the GetCustomerSettingsQuery
   * @throws TenantAccessDeniedException if the tenant context does not have access to the customer
   */
  async handle(query: GetCustomerSettingsQuery): Promise<OrganizationSettings | null> {
    // Validate tenant access to the customer ID
    this.tenantIsolationEnforcer.validateTenantAccess(query.customerId, query.tenantContext);

    // Find the customer
    const customer = await this.customerRepository.findById(query.customerId, query.tenantContext);

    // If customer not found, return null
    if (!customer) {
      return null;
    }

    // Validate tenant access to the customer
    this.customerValidator.validateTenantAccess(customer, query.tenantContext);

    // Return the customer settings
    return customer.getSettings();
  }
}