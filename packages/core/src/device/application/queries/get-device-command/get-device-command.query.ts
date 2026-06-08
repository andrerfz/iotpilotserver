import {TenantAwareQuery} from '@iotpilot/core/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export interface DeviceCommandResult {
    id: string;
    deviceId: string;
    command: string;
    status: string;
    output?: string;
    createdAt: Date;
}

/**
 * Query to get device command details
 */
export class GetDeviceCommandQuery extends TenantAwareQuery<DeviceCommandResult | null> {
    constructor(
        public readonly deviceId: string,
        public readonly commandId: string,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(
        deviceId: string,
        commandId: string,
        tenantContext: TenantContext
    ): GetDeviceCommandQuery {
        return new GetDeviceCommandQuery(deviceId, commandId, tenantContext);
    }
}

