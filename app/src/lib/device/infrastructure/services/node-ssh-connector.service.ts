import {randomUUID} from 'crypto';
import {SSHConnector} from '@/lib/device/domain/services/ssh-connector.service';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device.repository';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

// Dynamic import to avoid webpack bundling issues
type NodeSSH = any;

type ActiveSession = {
  ssh: NodeSSH;
  deviceId: string;
};

/**
 * Infrastructure SSHConnector implementation backed by node-ssh.
 * Uses DeviceEntity.sshCredentials (username/privateKey/passphrase) and DeviceEntity ip/tailscale ip.
 */
export class NodeSSHConnectorService implements SSHConnector {
  private sessions = new Map<string, ActiveSession>();

  constructor(private readonly deviceRepository: DeviceRepository) {}

  async connectToDevice(deviceId: DeviceId, tenantContext?: TenantContext): Promise<{ id: string }> {
    const device = await this.deviceRepository.findById(deviceId, tenantContext);
    if (!device) {
      throw new Error(`Device with ID ${deviceId.getValue()} not found`);
    }

    const host = device.getIpAddress()?.value || device.getTailscaleIp()?.value;
    if (!host) {
      throw new Error(`No IP address available for device ${deviceId.getValue()}`);
    }

    const creds = device.sshCredentials;
    if (!creds) {
      throw new Error(`No SSH credentials available for device ${deviceId.getValue()}`);
    }

    // Dynamically load NodeSSH to avoid webpack bundling
    // @ts-ignore - Runtime dependency only
    const {NodeSSH: NodeSSHClass} = eval('require')('node-ssh');
    const ssh = new NodeSSHClass();
    await ssh.connect({
      host,
      port: creds.port ?? 22,
      username: creds.username,
      privateKey: creds.privateKey,
      passphrase: creds.passphrase
    } as any);

    const sessionId = randomUUID();
    this.sessions.set(sessionId, { ssh, deviceId: deviceId.getValue() });
    return { id: sessionId };
  }

  async executeCommand(sessionId: string, command: string): Promise<{ output: string; error: string | null }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const result = await session.ssh.execCommand(command);
    return { output: result.stdout, error: result.stderr || null };
  }

  async disconnectFromDevice(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.ssh.dispose();
    this.sessions.delete(sessionId);
  }
}


