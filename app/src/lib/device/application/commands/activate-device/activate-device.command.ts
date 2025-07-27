import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {TenantAwareCommand} from '../../../../shared/application/commands/tenant-aware-command';
import {TenantContext} from '../../../../shared/domain/tenant-context';

export class ActivateDeviceCommand extends TenantAwareCommand {
  constructor(
    public readonly deviceId: DeviceId,
    tenantContext: TenantContext
  ) {
    super(tenantContext);
  }
}