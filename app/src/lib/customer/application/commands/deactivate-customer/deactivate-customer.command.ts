import { TenantAwareCommand } from '@/lib/shared/application/commands/tenant-aware-command';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';

export class DeactivateCustomerCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
  }

  /**
   * Factory method to create a new DeactivateCustomerCommand
   */
  static create(
    tenantContext: TenantContext,
    customerId: string
  ): DeactivateCustomerCommand {
    return new DeactivateCustomerCommand(
      tenantContext,
      new CustomerId(customerId)
    );
  }
}