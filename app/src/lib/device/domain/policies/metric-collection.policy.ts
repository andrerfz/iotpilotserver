import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { DeviceExistsPolicy } from './device-exists.policy';
import { InvalidDeviceDataException } from '../exceptions/invalid-device-data.exception';

export class MetricCollectionPolicy {
    private readonly deviceExistsPolicy: DeviceExistsPolicy;

    constructor(private readonly deviceRepository: DeviceRepository) {
        this.deviceExistsPolicy = new DeviceExistsPolicy(deviceRepository);
    }

    async validate(deviceId: DeviceId): Promise<void> {
        // First check if the device exists
        await this.deviceExistsPolicy.validate(deviceId);

        // Then check if the device is in a state that allows metric collection
        const device = await this.deviceRepository.findById(deviceId);
        if (device && device.status.getValue === 'inactive') {
            throw new InvalidDeviceDataException(
                `Cannot collect metrics for inactive device ${deviceId.getValue}`
            );
        }

        // Additional checks could be added here
        // For example, check if the device has been recently accessed, 
        // if it has the necessary capabilities for metrics collection, etc.
    }

    validateMetricValues(
        cpuUsage: number,
        memoryUsage: number,
        diskUsage: number,
        networkUsage: number
    ): void {
        // Validate that metric values are within acceptable ranges
        if (cpuUsage < 0 || cpuUsage > 100) {
            throw new InvalidDeviceDataException(`CPU usage must be between 0 and 100, got ${cpuUsage}`);
        }

        if (memoryUsage < 0 || memoryUsage > 100) {
            throw new InvalidDeviceDataException(`Memory usage must be between 0 and 100, got ${memoryUsage}`);
        }

        if (diskUsage < 0 || diskUsage > 100) {
            throw new InvalidDeviceDataException(`Disk usage must be between 0 and 100, got ${diskUsage}`);
        }

        if (networkUsage < 0) {
            throw new InvalidDeviceDataException(`Network usage cannot be negative, got ${networkUsage}`);
        }
    }
}