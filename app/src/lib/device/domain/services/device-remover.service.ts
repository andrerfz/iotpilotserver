import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { DeviceNotFoundException } from '../exceptions/device-not-found.exception';

export class DeviceRemover {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  async remove(id: DeviceId): Promise<void> {
    // Check if the device exists
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${id.value} not found`);
    }

    // Delete the device
    await this.deviceRepository.delete(id);
  }
}