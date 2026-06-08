import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceRepository} from '../interfaces/device.repository';
import {TenantContext} from '../../../shared/domain/tenant-context';

export class DeviceExistsPolicy {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  async validate(deviceId: string, tenantContext?: TenantContext): Promise<void> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (!device) {
      throw new Error(`Device ${deviceId} does not exist`);
    }
  }
}
