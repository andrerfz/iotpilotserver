import {TenantAwareQuery} from '@/lib/shared/application/tenant-aware.query';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

/**
 * Query to get device command details
 */
export class GetDeviceCommandQuery extends TenantAwareQuery {
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

