import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class DeactivateCustomerCommand extends TenantAwareCommand {
  constructor(
    tenantContext: TenantContext,
    public readonly customerId: string
  ) {
    super(tenantContext);
  }

  static fromRequest(request: any, tenantContext: TenantContext): DeactivateCustomerCommand {
    const { customerId } = request.body;
    
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    return new DeactivateCustomerCommand(tenantContext, customerId);
  }
}
