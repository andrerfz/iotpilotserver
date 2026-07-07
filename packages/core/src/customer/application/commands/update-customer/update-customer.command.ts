import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export class UpdateCustomerCommand extends TenantAwareCommand {
  constructor(
    tenantContext: TenantContext,
    public readonly customerId: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly contactEmail?: string,
    public readonly alertDedupEnabled?: boolean
  ) {
    super(tenantContext);
  }

  static fromRequest(request: any, tenantContext: TenantContext): UpdateCustomerCommand {
    const { customerId, name, description, contactEmail, alertDedupEnabled } = request.body;

    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    return new UpdateCustomerCommand(tenantContext, customerId, name, description, contactEmail, alertDedupEnabled);
  }
}
