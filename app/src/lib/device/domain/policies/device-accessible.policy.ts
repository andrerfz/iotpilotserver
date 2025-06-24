import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { DeviceAccessDeniedException } from '../exceptions/device-access-denied.exception';
import { DeviceExistsPolicy } from './device-exists.policy';

export class DeviceAccessiblePolicy {
    private readonly deviceExistsPolicy: DeviceExistsPolicy;

    constructor(
        private readonly deviceRepository: DeviceRepository,
        private readonly userPermissionsService: {
            hasDeviceAccess(userId: string, deviceId: string): Promise<boolean>;
        }
    ) {
        this.deviceExistsPolicy = new DeviceExistsPolicy(deviceRepository);
    }

    async validate(deviceId: DeviceId, userId: string): Promise<void> {
        // First check if the device exists
        await this.deviceExistsPolicy.validate(deviceId);

        // Then check if the user has access to the device
        const hasAccess = await this.userPermissionsService.hasDeviceAccess(
            userId,
            deviceId.getValue
        );

        if (!hasAccess) {
            throw new DeviceAccessDeniedException(deviceId.getValue, userId);
        }
    }
}