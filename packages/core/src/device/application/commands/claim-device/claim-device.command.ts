import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export interface ClaimDeviceData {
    deviceId: string;   // IOT-XXXX-YYYY format
    name?: string;      // Optional human-readable name customer gives the device
}

/**
 * Command to claim an UNCLAIMED device.
 * Must be executed by an authenticated customer user.
 * Associates the device with the customer and returns a one-time claiming token.
 */
export class ClaimDeviceCommand extends TenantAwareCommand {
    static readonly type = 'ClaimDeviceCommand';

    constructor(
        public readonly data: ClaimDeviceData,
        public readonly userId: string,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(
        data: ClaimDeviceData,
        userId: string,
        tenantContext: TenantContext
    ): ClaimDeviceCommand {
        return new ClaimDeviceCommand(data, userId, tenantContext);
    }
}
