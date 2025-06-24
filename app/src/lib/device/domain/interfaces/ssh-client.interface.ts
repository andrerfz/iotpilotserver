import { DeviceId } from '../value-objects/device-id.vo';
import { IpAddress } from '../value-objects/ip-address.vo';
import { Port } from '../value-objects/port.vo';
import { SshCredentials } from '../value-objects/ssh-credentials.vo';
import { SSHSession } from '../entities/ssh-session.entity';

export interface SSHClient {
    connect(
        deviceId: DeviceId,
        ipAddress: IpAddress,
        port: Port,
        credentials: SshCredentials
    ): Promise<SSHSession>;
    
    disconnect(sessionId: string): Promise<void>;
    
    executeCommand(
        sessionId: string,
        command: string
    ): Promise<{ output: string; error: string | null }>;
    
    isConnected(sessionId: string): Promise<boolean>;
    
    getActiveSessions(): Promise<SSHSession[]>;
}