import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {TenantAwareCommand} from '../../../../shared/application/commands/tenant-aware-command';
import {TenantContext} from '../../../../shared/domain/tenant-context';

export class DeactivateDeviceCommand extends TenantAwareCommand {
  constructor(
    public readonly deviceId: DeviceId,  // Required parameter first
    public readonly reason: string,
    tenantContext: TenantContext  // Last parameter
  ) {
    super(tenantContext);
  }
}