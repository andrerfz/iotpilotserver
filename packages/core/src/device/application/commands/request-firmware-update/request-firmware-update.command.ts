import { TenantAwareCommand } from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import { TenantContext } from '@iotpilot/core/shared/domain/tenant-context';

export class RequestFirmwareUpdateCommand extends TenantAwareCommand {
  static readonly type = 'RequestFirmwareUpdateCommand';

  constructor(
    tenantContext: TenantContext,
    public readonly deviceId: string,
    public readonly targetVersion: string,
  ) {
    super(tenantContext);
  }
}
