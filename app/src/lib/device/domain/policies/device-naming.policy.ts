import {DeviceName} from '../value-objects/device-name.vo';
import {DeviceRepository} from '../interfaces/device.repository';
import {InvalidDeviceDataException} from '../exceptions/invalid-device-data.exception';

export class DeviceNamingPolicy {
    constructor(private readonly deviceRepository: DeviceRepository) {}

    /**
     * Synchronously validates if a device name meets the basic format requirements
     * This does not check for name uniqueness in the database
     */
    isValidName(name: DeviceName): boolean {
        // Basic validation rules
        const nameValue = name.getValue();
        
        // Name should not be empty
        if (!nameValue || nameValue.trim() === '') {
            return false;
        }
        
        // Name should be between 3 and 50 characters
        if (nameValue.length < 3 || nameValue.length > 50) {
            return false;
        }
        
        // Name should not contain special characters except dash and underscore
        if (!/^[a-zA-Z0-9-_]+$/.test(nameValue)) {
            return false;
        }
        
        // Name should not be a reserved name
        const reservedNames = ['localhost', 'server', 'router', 'switch', 'gateway'];
        if (reservedNames.includes(nameValue.toLowerCase())) {
            return false;
        }
        
        return true;
    }

    async validate(name: DeviceName, excludeDeviceId?: string): Promise<void> {
        // Check if the name is already in use by another device
        const existingDevice = await this.deviceRepository.findByName(name.getValue());

        if (existingDevice && (!excludeDeviceId || existingDevice.id.getValue() !== excludeDeviceId)) {
            throw new InvalidDeviceDataException(`Device name '${name.getValue()}' is already in use`);
        }

        // Additional naming rules could be added here
        // For example, check for reserved names, format requirements, etc.
        const reservedNames = ['localhost', 'server', 'router', 'switch', 'gateway'];
        if (reservedNames.includes(name.getValue().toLowerCase())) {
            throw new InvalidDeviceDataException(`Device name '${name.getValue()}' is reserved and cannot be used`);
        }
    }
}
