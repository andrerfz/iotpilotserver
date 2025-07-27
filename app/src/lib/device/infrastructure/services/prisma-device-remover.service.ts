import {DeviceRemover} from '@/lib/device/domain/services/device-remover.service';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device.repository';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class PrismaDeviceRemover implements DeviceRemover {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly tenantContext?: TenantContext
  ) {}

  async removeDevice(deviceId: DeviceId): Promise<void> {
    await this.deviceRepository.softDelete(deviceId, this.tenantContext);
  }

  async forceRemoveDevice(deviceId: DeviceId): Promise<void> {
    // Current persistence uses soft deletes; force removal maps to the same behavior for now.
    await this.deviceRepository.softDelete(deviceId, this.tenantContext);
  }
}


