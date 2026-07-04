import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

/** Roles an ADMIN may grant via invite. SUPERADMIN is never invited this way. */
export type InvitableRole = 'ADMIN' | 'USER' | 'READONLY';

export class InviteUserCommand extends TenantAwareCommand {
  static readonly type = 'InviteUserCommand';

  constructor(
    tenantContext: TenantContext,
    public readonly email: string,
    public readonly role: InvitableRole,
  ) {
    super(tenantContext);
  }
}
