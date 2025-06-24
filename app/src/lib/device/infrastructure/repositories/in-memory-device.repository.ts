import { Device } from '@/lib/device/domain/entities/device.entity';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
import { DeviceRepository } from '@/lib/device/domain/interfaces/device-repository.interface';

export class InMemoryDeviceRepository implements DeviceRepository {
  private devices: Map<string, Device> = new Map();

  async findById(id: DeviceId): Promise<Device | null> {
    return this.devices.get(id.value) || null;
  }

  async findByName(name: string): Promise<Device | null> {
    const devices = Array.from(this.devices.values());
    for (const device of devices) {
      if (device.name.value === name) {
        return device;
      }
    }
    return null;
  }

  async findByIpAddress(ipAddress: string): Promise<Device | null> {
    const devices = Array.from(this.devices.values());
    for (const device of devices) {
      if (device.ipAddress.value === ipAddress) {
        return device;
      }
    }
    return null;
  }

  async findAll(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async findActive(): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(
      device => device.status.value === 'active'
    );
  }

  async findInactive(): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(
      device => device.status.value === 'inactive'
    );
  }

  async save(device: Device): Promise<void> {
    this.devices.set(device.id.value, device);
  }

  async delete(id: DeviceId): Promise<void> {
    this.devices.delete(id.value);
  }

  // Helper methods for testing
  clear(): void {
    this.devices.clear();
  }

  count(): number {
    return this.devices.size;
  }
}
