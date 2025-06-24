import { Injectable } from '@nestjs/common';
import { Customer } from '../entities/customer.entity';
import { OrganizationSettings, OrganizationSettingsProps } from '../value-objects/organization-settings.vo';
import { CustomerInvalidSettingsException } from '../exceptions/customer.exception';
import { TenantContext } from '../../../shared/application/context/tenant-context.vo';
import { TenantAccessDeniedException, TenantQuotaExceededException } from '../../../shared/domain/exceptions/tenant.exception';

@Injectable()
export class OrganizationManager {
  /**
   * Updates the organization settings for a customer
   * @throws TenantAccessDeniedException if the tenant context does not have access to the customer
   * @throws CustomerInvalidSettingsException if the settings are invalid
   */
  updateSettings(
    customer: Customer,
    settingsProps: OrganizationSettingsProps,
    tenantContext: TenantContext
  ): Customer {
    // Validate tenant access
    if (!tenantContext.hasAccess(customer.getId()) && !tenantContext.canBypassTenantRestrictions()) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        customer.getId(),
        `User ${tenantContext.getUserId().toString()} does not have access to customer ${customer.getId().toString()}`
      );
    }

    try {
      // Create new settings value object
      const settings = new OrganizationSettings(settingsProps);
      
      // Update customer settings
      customer.updateSettings(settings);
      
      return customer;
    } catch (error) {
      // Convert validation errors to domain exceptions
      throw new CustomerInvalidSettingsException(error.message);
    }
  }

  /**
   * Validates that the organization settings are within allowed limits
   * @throws TenantQuotaExceededException if any quota is exceeded
   */
  validateQuotas(settings: OrganizationSettings, limits: { maxUsers: number, maxDevices: number }): void {
    if (settings.getMaxUsers() > limits.maxUsers) {
      throw new TenantQuotaExceededException(
        'global',
        'maxUsers',
        limits.maxUsers,
        `Maximum users quota exceeded. Requested: ${settings.getMaxUsers()}, Limit: ${limits.maxUsers}`
      );
    }

    if (settings.getMaxDevices() > limits.maxDevices) {
      throw new TenantQuotaExceededException(
        'global',
        'maxDevices',
        limits.maxDevices,
        `Maximum devices quota exceeded. Requested: ${settings.getMaxDevices()}, Limit: ${limits.maxDevices}`
      );
    }
  }

  /**
   * Checks if a feature is enabled for a customer
   */
  isFeatureEnabled(customer: Customer, featureName: string): boolean {
    return customer.getSettings().hasFeature(featureName);
  }

  /**
   * Gets the maximum number of users allowed for a customer
   */
  getMaxUsers(customer: Customer): number {
    return customer.getSettings().getMaxUsers();
  }

  /**
   * Gets the maximum number of devices allowed for a customer
   */
  getMaxDevices(customer: Customer): number {
    return customer.getSettings().getMaxDevices();
  }

  /**
   * Gets the data retention period in days for a customer
   */
  getDataRetentionDays(customer: Customer): number {
    return customer.getSettings().getDataRetentionDays();
  }
}