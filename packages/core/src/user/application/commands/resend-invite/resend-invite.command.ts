import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export class ResendInviteCommand extends TenantAwareCommand {
  static readonly type = 'ResendInviteCommand';

  constructor(
    tenantContext: TenantContext,
    /** Internal user id (already resolved from the public id by the route). */
    public readonly userId: string,
  ) {
    super(tenantContext);
  }
}
