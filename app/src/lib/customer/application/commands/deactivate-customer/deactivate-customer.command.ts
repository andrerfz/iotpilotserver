import { TenantAwareCommand } from '../../../../shared/application/commands/tenant-aware-command';
import { TenantContext } from '../../../../shared/application/context/tenant-context.vo';
import { CustomerId } from '../../../domain/value-objects/customer-id.vo';

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