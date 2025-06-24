import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { DeviceAccessiblePolicy } from './device-accessible.policy';
import { SSHConnectionFailedException } from '../exceptions/ssh-connection-failed.exception';
import { DeviceStatus } from '../value-objects/device-status.vo';

export class SSHAllowedPolicy {
    private readonly deviceAccessiblePolicy: DeviceAccessiblePolicy;

    constructor(
        private readonly deviceRepository: DeviceRepository,
        private readonly userPermissionsService: {
            hasDeviceAccess(userId: string, deviceId: string): Promise<boolean>;
            hasSSHPermission(userId: string): Promise<boolean>;
        }
    ) {
        this.deviceAccessiblePolicy = new DeviceAccessiblePolicy(
            deviceRepository,
            userPermissionsService
        );
    }

    async validate(deviceId: DeviceId, userId: string): Promise<void> {
        // First check if the user has access to the device
        await this.deviceAccessiblePolicy.validate(deviceId, userId);

        // Then check if the user has SSH permission
        const hasSSHPermission = await this.userPermissionsService.hasSSHPermission(userId);
        if (!hasSSHPermission) {
            throw new SSHConnectionFailedException(
                deviceId.getValue,
                'User does not have SSH permission'
            );
        }

        // Finally check if the device is active
        const device = await this.deviceRepository.findById(deviceId);
        if (device && device.status.getValue !== 'active') {
            throw new SSHConnectionFailedException(
                deviceId.getValue,
                `Device is not active (current status: ${device.status.getValue})`
            );
        }
    }
}