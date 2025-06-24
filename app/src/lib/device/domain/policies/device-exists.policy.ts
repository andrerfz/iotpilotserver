import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { DeviceNotFoundException } from '../exceptions/device-not-found.exception';

export class DeviceExistsPolicy {
    constructor(private readonly deviceRepository: DeviceRepository) {}

    async validate(deviceId: DeviceId): Promise<void> {
        const device = await this.deviceRepository.findById(deviceId);
        if (!device) {
            throw new DeviceNotFoundException(deviceId.getValue);
        }
    }
}