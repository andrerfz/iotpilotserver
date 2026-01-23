import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

/**
 * DTO for heartbeat data from device
 */
export interface HeartbeatData {
    deviceId: string;
    hostname: string;
    uptime?: string;
    loadAverage?: string;
    cpuUsage?: number;
    cpuTemperature?: number;
    memoryUsagePercent?: number;
    memoryUsedMb?: number;
    memoryTotalMb?: number;
    diskUsagePercent?: number;
    diskUsed?: string;
    diskTotal?: string;
    appStatus?: 'RUNNING' | 'STOPPED' | 'ERROR' | 'NOT_INSTALLED' | 'UNKNOWN';
    agentVersion?: string;
    lastBoot?: string;
    timestamp?: string;
    ipAddress?: string;
    tailscaleIp?: string;
}

/**
 * Command to process a device heartbeat
 * This command updates device status and stores metrics
 */
export class ProcessHeartbeatCommand extends TenantAwareCommand {
    constructor(
        public readonly data: HeartbeatData,
        public readonly userId: string,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(
        data: HeartbeatData,
        userId: string,
        tenantContext: TenantContext
    ): ProcessHeartbeatCommand {
        return new ProcessHeartbeatCommand(data, userId, tenantContext);
    }
}


