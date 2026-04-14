import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export interface ProvisionDeviceData {
    deviceId: string;
    claimingToken: string;
    macAddress?: string;
    ipAddress?: string;
    firmwareVersion?: string;
    deviceModel?: string;
}

/**
 * Command to provision a device after WiFi setup.
 * Called by the device itself (no JWT — authenticated via claiming token).
 * Validates the one-time token and returns a permanent API key.
 */
export class ProvisionDeviceCommand extends TenantAwareCommand {
    static readonly type = 'ProvisionDeviceCommand';

    constructor(
        public readonly data: ProvisionDeviceData,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(
        data: ProvisionDeviceData,
        tenantContext: TenantContext
    ): ProvisionDeviceCommand {
        return new ProvisionDeviceCommand(data, tenantContext);
    }
}
