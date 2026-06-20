import {randomUUID} from 'crypto';
import {SSHConnector} from '@iotpilot/core/device/domain/services/ssh-connector.service';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

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

  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly onNewHostKey?: (deviceId: string, fingerprint: string) => Promise<void>,
  ) {}

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

    const storedHostKey = creds.sshHostKey;
    const deviceIdStr = deviceId.getValue();
    let fingerprintSeen: string | null = null;

    const connectConfig: Record<string, any> = {
      host,
      port: creds.port ?? 22,
      username: creds.username,
      hostHash: 'sha256',
      hostVerifier: (hashBuf: Buffer) => {
        const fp = hashBuf.toString('hex');
        if (!storedHostKey) {
          fingerprintSeen = fp;
          return true; // first connect: trust and record
        }
        if (fp !== storedHostKey) {
          // Mismatch — OS reinstall or MITM. Admin must update SSH credentials to re-trust.
          return false;
        }
        return true;
      },
    };
    if (creds.password) {
      connectConfig['password'] = creds.password;
    } else if (creds.privateKey && creds.privateKey !== 'password-based-auth') {
      connectConfig['privateKey'] = creds.privateKey;
      if (creds.passphrase) connectConfig['passphrase'] = creds.passphrase;
    }

    await ssh.connect(connectConfig as any);

    // TOFU: persist fingerprint if this was a first connect
    if (fingerprintSeen && !storedHostKey && this.onNewHostKey) {
      void this.onNewHostKey(deviceIdStr, fingerprintSeen).catch(() => {/* non-critical */});
    }

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


