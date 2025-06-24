import { DeviceName } from '../value-objects/device-name.vo';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { InvalidDeviceDataException } from '../exceptions/invalid-device-data.exception';

export class DeviceNamingPolicy {
    constructor(private readonly deviceRepository: DeviceRepository) {}

    async validate(name: DeviceName, excludeDeviceId?: string): Promise<void> {
        // Check if the name is already in use by another device
        const existingDevice = await this.deviceRepository.findByName(name.getValue);
        
        if (existingDevice && (!excludeDeviceId || existingDevice.id.getValue !== excludeDeviceId)) {
            throw new InvalidDeviceDataException(`Device name '${name.getValue}' is already in use`);
        }
        
        // Additional naming rules could be added here
        // For example, check for reserved names, format requirements, etc.
        const reservedNames = ['localhost', 'server', 'router', 'switch', 'gateway'];
        if (reservedNames.includes(name.getValue.toLowerCase())) {
            throw new InvalidDeviceDataException(`Device name '${name.getValue}' is reserved and cannot be used`);
        }
    }
}