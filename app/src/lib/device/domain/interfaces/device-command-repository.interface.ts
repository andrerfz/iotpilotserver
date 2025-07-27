import {DeviceCommand} from '../entities/device-command.entity';
import {DeviceId} from '../value-objects/device-id.vo';

/**
 * Repository interface for DeviceCommand aggregate
 * Following the repository pattern for data access abstraction
 */
export interface DeviceCommandRepository {
    /**
     * Find a command by its ID
     */
    findById(id: string): Promise<DeviceCommand | null>;

    /**
     * Find all commands for a specific device
     */
    findByDeviceId(deviceId: DeviceId): Promise<DeviceCommand[]>;

    /**
     * Find pending commands for a device
     */
    findPendingByDeviceId(deviceId: DeviceId): Promise<DeviceCommand[]>;

    /**
     * Save a new or updated command
     */
    save(command: DeviceCommand): Promise<void>;

    /**
     * Update command status and result
     */
    update(command: DeviceCommand): Promise<void>;

    /**
     * Delete a command (soft delete)
     */
    delete(id: string): Promise<void>;

    /**
     * Count pending commands for a device
     */
    countPendingByDeviceId(deviceId: DeviceId): Promise<number>;

    /**
     * Find recent commands for a device (with pagination)
     */
    findRecentByDeviceId(
        deviceId: DeviceId, 
        limit?: number, 
        offset?: number
    ): Promise<DeviceCommand[]>;
}


