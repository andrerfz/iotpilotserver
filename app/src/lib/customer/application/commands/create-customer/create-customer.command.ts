import { TenantAwareCommand } from '@/lib/shared/application/commands/tenant-aware-command';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { CustomerName } from '@/lib/customer/domain/value-objects/customer-name.vo';
import { OrganizationSettings, OrganizationSettingsProps } from '@/lib/customer/domain/value-objects/organization-settings.vo';

export class CreateCustomerCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly customerId: CustomerId,
    public readonly customerName: CustomerName,
    public readonly settings: OrganizationSettings
  ) {
    super(tenantContext);
  }

  /**
   * Factory method to create a new CreateCustomerCommand
   */
  static create(
    tenantContext: TenantContext,
    customerId: string,
    customerName: string,
    settings: OrganizationSettingsProps
  ): CreateCustomerCommand {
    return new CreateCustomerCommand(
      tenantContext,
      new CustomerId(customerId),
      new CustomerName(customerName),
      new OrganizationSettings(settings)
    );
  }
}