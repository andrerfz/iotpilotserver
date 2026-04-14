import {DeviceId} from '../value-objects/device-id.vo';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

/**
 * Domain contract for SSH operations used by ExecuteSSHCommandHandler.
 * Implementations live in infrastructure.
 */
export interface SSHConnector {
  connectToDevice(deviceId: DeviceId, tenantContext?: TenantContext): Promise<{ id: string }>;
  disconnectFromDevice(sessionId: string, tenantContext?: TenantContext): Promise<void>;
  executeCommand(sessionId: string, command: string, tenantContext?: TenantContext): Promise<{ output: string; error: string | null }>;
}