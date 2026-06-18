import {TenantAwareCommand} from '../../../../shared/application/commands/tenant-aware-command';
import {TenantContext} from '../../../../shared/domain/tenant-context';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceName} from '../../../domain/value-objects/device-name.vo';
import {IpAddress} from '../../../../shared/domain/value-objects/ip-address.vo';
import {SSHCredentials} from '../../../domain/entities/device.entity';

/**
 * Command for updating an existing device
 */
export class UpdateDeviceCommand extends TenantAwareCommand {
  /** Static type identifier that survives minification */
  static readonly type = 'UpdateDeviceCommand';

  constructor(
    public readonly deviceId: DeviceId,
    tenantContext: TenantContext,
    public readonly name?: DeviceName,
    public readonly ipAddress?: IpAddress,
    public readonly tailscaleIp?: IpAddress,
    public readonly hostname?: string,
    public readonly sshCredentials?: SSHCredentials
  ) {
    super(tenantContext);
  }

  static create(
    deviceId: DeviceId,
    tenantContext: TenantContext,
    hostname?: string,
    ipAddress?: string,
    sshUsername?: string,
    sshPassword?: string,
    sshPort?: number,
    customerId?: string
  ): UpdateDeviceCommand {
    // Convert string parameters to value objects where needed
    const deviceName = hostname ? DeviceName.create(hostname) : undefined;
    const ipAddr = ipAddress ? IpAddress.fromString(ipAddress) : undefined;
    const sshCreds = sshUsername ?
      { username: sshUsername, password: sshPassword || undefined, privateKey: 'password-based-auth', port: sshPort || 22 } :
      undefined;

    return new UpdateDeviceCommand(
      deviceId,
      tenantContext,
      deviceName,
      ipAddr,
      undefined, // tailscaleIp
      hostname, // hostname as string
      sshCreds
    );
  }
}