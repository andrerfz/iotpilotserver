import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceName} from '../../../domain/value-objects/device-name.vo';
import {TenantAwareCommand} from '../../../../shared/application/commands/tenant-aware-command';
import {TenantContext} from '../../../../shared/domain/tenant-context';
import {IpAddress} from '../../../../shared/domain/value-objects/ip-address.vo';
import {SSHCredentials} from '../../../domain/entities/device.entity';

export class RegisterDeviceCommand extends TenantAwareCommand {
  /** Static type identifier that survives minification */
  static readonly type = 'RegisterDeviceCommand';

  constructor(
    public readonly deviceId: DeviceId,
    public readonly name: DeviceName,
    tenantContext: TenantContext,
    public readonly ipAddress?: IpAddress,
    public readonly tailscaleIp?: IpAddress,
    public readonly hostname?: string,
    public readonly sshCredentials?: SSHCredentials
  ) {
    super(tenantContext);
  }
}