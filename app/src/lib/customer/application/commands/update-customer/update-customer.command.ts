import { TenantAwareCommand } from '@/lib/shared/application/commands/tenant-aware-command';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { CustomerName } from '@/lib/customer/domain/value-objects/customer-name.vo';
import { OrganizationSettings, OrganizationSettingsProps } from '@/lib/customer/domain/value-objects/organization-settings.vo';

export class UpdateCustomerCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly customerId: CustomerId,
    public readonly customerName?: CustomerName,
    public readonly settings?: OrganizationSettings
  ) {
    super(tenantContext);
  }

  /**
   * Factory method to create a new UpdateCustomerCommand
   */
  static create(
    tenantContext: TenantContext,
    customerId: string,
    customerName?: string,
    settings?: OrganizationSettingsProps
  ): UpdateCustomerCommand {
    return new UpdateCustomerCommand(
      tenantContext,
      new CustomerId(customerId),
      customerName ? new CustomerName(customerName) : undefined,
      settings ? new OrganizationSettings(settings) : undefined
    );
  }

  /**
   * Checks if the command includes a name update
   */
  hasNameUpdate(): boolean {
    return !!this.customerName;
  }

  /**
   * Checks if the command includes settings update
   */
  hasSettingsUpdate(): boolean {
    return !!this.settings;
  }

  /**
   * Validates that the command has at least one update
   * @throws Error if the command has no updates
   */
  validateHasUpdates(): void {
    if (!this.hasNameUpdate() && !this.hasSettingsUpdate()) {
      throw new Error('Update command must include at least one update');
    }
  }
}