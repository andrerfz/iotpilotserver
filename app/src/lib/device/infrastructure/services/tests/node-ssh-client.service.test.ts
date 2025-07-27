import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NodeSSHClientService} from '../node-ssh-client.service';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {IpAddress} from '../../../domain/value-objects/ip-address.vo';
import {Port} from '../../../domain/value-objects/port.vo';
import {SshCredentials} from '../../../domain/value-objects/ssh-credentials.vo';

// Mock NodeSSH
const mockSSHConnection = {
  connect: vi.fn(),
  execCommand: vi.fn(),
  dispose: vi.fn(),
  requestShell: vi.fn(),
  withShell: vi.fn(),
  getFile: vi.fn(),
  putFile: vi.fn(),
  putFiles: vi.fn(),
  putDirectory: vi.fn(),
  exec: vi.fn(),
};

const mockNodeSSH = vi.fn().mockImplementation(() => mockSSHConnection);

vi.mock('node-ssh', () => ({
  NodeSSH: mockNodeSSH,
}));

describe('NodeSSHClientService', () => {
  let sshClient: NodeSSHClientService;
  let deviceId: DeviceId;
  let ipAddress: IpAddress;
  let port: Port;
  let credentials: SshCredentials;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    sshClient = new NodeSSHClientService();
    deviceId = DeviceId.create('device-1');
    ipAddress = IpAddress.create('192.168.1.100');
    port = Port.create(22);
    credentials = SshCredentials.create('testuser', 'testpass');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connect', () => {
    it('should establish SSH connection successfully', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      expect(mockSSHConnection.connect).toHaveBeenCalledWith({
        host: '192.168.1.100',
        port: 22,
        username: 'testuser',
        password: 'testpass',
        readyTimeout: 30000,
        keepaliveInterval: 10000,
      });

      expect(session).toBeDefined();
      expect(session.deviceId.value).toBe('device-1');
      expect(session.ipAddress.value).toBe('192.168.1.100');
      expect(session.sessionId).toContain('device-1-');
    });

    it('should store session in active sessions map', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      const sessions = (sshClient as any).activeSessions;
      expect(sessions.has(session.sessionId)).toBe(true);
      expect(sessions.get(session.sessionId)).toEqual({
        ssh: mockSSHConnection,
        session,
      });
    });

    it('should throw SSHConnectionFailedException on connection failure', async () => {
      mockSSHConnection.connect.mockRejectedValue(new Error('Connection refused'));

      await expect(sshClient.connect(deviceId, ipAddress, port, credentials))
        .rejects.toThrow('SSH connection failed: Connection refused');
    });

    it('should handle non-Error exceptions', async () => {
      mockSSHConnection.connect.mockRejectedValue('String error');

      await expect(sshClient.connect(deviceId, ipAddress, port, credentials))
        .rejects.toThrow('SSH connection failed: Unknown error');
    });

    it('should generate unique session IDs', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const session1 = await sshClient.connect(deviceId, ipAddress, port, credentials);
      const session2 = await sshClient.connect(DeviceId.create('device-2'), ipAddress, port, credentials);

      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session1.sessionId).toContain('device-1-');
      expect(session2.sessionId).toContain('device-2-');
    });
  });

  describe('executeCommand', () => {
    it('should execute command and return result', async () => {
      // Create a session first
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      mockSSHConnection.execCommand.mockResolvedValue({
        stdout: 'file1.txt\nfile2.txt',
        stderr: '',
        code: 0,
        signal: null,
      });

      const result = await sshClient.executeCommand(session.sessionId, 'ls -la');

      expect(mockSSHConnection.execCommand).toHaveBeenCalledWith('ls -la');
      expect(result).toEqual({
        output: 'file1.txt\nfile2.txt',
        error: '',
        exitCode: 0,
      });
    });

    it('should throw error for non-existent session', async () => {
      await expect(sshClient.executeCommand('non-existent-session', 'ls'))
        .rejects.toThrow('Session non-existent-session not found');
    });

    it('should handle command execution errors', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      mockSSHConnection.execCommand.mockRejectedValue(new Error('Command failed'));

      await expect(sshClient.executeCommand(session.sessionId, 'invalid-command'))
        .rejects.toThrow('SSH command execution failed: Command failed');
    });

    it('should handle command stderr and exit codes', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      mockSSHConnection.execCommand.mockResolvedValue({
        stdout: 'some output',
        stderr: 'warning: some issue',
        code: 1,
        signal: null,
      });

      const result = await sshClient.executeCommand(session.sessionId, 'problematic-command');

      expect(result).toEqual({
        output: 'some output',
        error: 'warning: some issue',
        exitCode: 1,
      });
    });

    it('should handle command execution with signal termination', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      mockSSHConnection.execCommand.mockResolvedValue({
        stdout: '',
        stderr: '',
        code: null,
        signal: 'SIGTERM',
      });

      const result = await sshClient.executeCommand(session.sessionId, 'killed-command');

      expect(result).toEqual({
        output: '',
        error: '',
        exitCode: -1, // Signal termination
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect and remove session', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      await sshClient.disconnect(session.sessionId);

      expect(mockSSHConnection.dispose).toHaveBeenCalled();
      expect((sshClient as any).activeSessions.has(session.sessionId)).toBe(false);
    });

    it('should handle disconnection of non-existent session gracefully', async () => {
      await expect(sshClient.disconnect('non-existent-session')).resolves.not.toThrow();
    });

    it('should handle dispose errors gracefully', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      mockSSHConnection.dispose.mockRejectedValue(new Error('Dispose failed'));

      await expect(sshClient.disconnect(session.sessionId)).resolves.not.toThrow();

      // Session should still be removed
      expect((sshClient as any).activeSessions.has(session.sessionId)).toBe(false);
    });
  });

  describe('isConnected', () => {
    it('should return true for active session', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      const result = await sshClient.isConnected(session.sessionId);
      expect(result).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      const result = await sshClient.isConnected('non-existent-session');
      expect(result).toBe(false);
    });
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const session1 = await sshClient.connect(deviceId, ipAddress, port, credentials);
      const session2 = await sshClient.connect(DeviceId.create('device-2'), ipAddress, port, credentials);

      const sessions = await sshClient.getActiveSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions).toContain(session1);
      expect(sessions).toContain(session2);
    });

    it('should return empty array when no active sessions', async () => {
      const sessions = await sshClient.getActiveSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('getSessionInfo', () => {
    it('should return session information', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      const info = await sshClient.getSessionInfo(session.sessionId);

      expect(info).toEqual({
        sessionId: session.sessionId,
        deviceId: 'device-1',
        ipAddress: '192.168.1.100',
        username: 'testuser',
        connectedAt: session.connectedAt,
      });
    });

    it('should return null for non-existent session', async () => {
      const info = await sshClient.getSessionInfo('non-existent-session');
      expect(info).toBeNull();
    });
  });

  describe('session management', () => {
    it('should maintain separate sessions for different devices', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const device1Session = await sshClient.connect(deviceId, ipAddress, port, credentials);
      const device2Session = await sshClient.connect(DeviceId.create('device-2'), ipAddress, port, credentials);

      expect(device1Session.sessionId).not.toBe(device2Session.sessionId);
      expect((sshClient as any).activeSessions.size).toBe(2);
    });

    it('should allow multiple sessions to same device', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const session1 = await sshClient.connect(deviceId, ipAddress, port, credentials);

      // Advance time to ensure different session ID
      vi.advanceTimersByTime(1000);

      const session2 = await sshClient.connect(deviceId, ipAddress, port, credentials);

      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect((sshClient as any).activeSessions.size).toBe(2);
    });

    it('should clean up sessions on disconnect', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      expect((sshClient as any).activeSessions.size).toBe(1);

      await sshClient.disconnect(session.sessionId);

      expect((sshClient as any).activeSessions.size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid credentials gracefully', async () => {
      mockSSHConnection.connect.mockRejectedValue(new Error('Authentication failed'));

      await expect(sshClient.connect(deviceId, ipAddress, port, credentials))
        .rejects.toThrow('SSH connection failed: Authentication failed');
    });

    it('should handle network timeouts', async () => {
      mockSSHConnection.connect.mockRejectedValue(new Error('Connection timeout'));

      await expect(sshClient.connect(deviceId, ipAddress, port, credentials))
        .rejects.toThrow('SSH connection failed: Connection timeout');
    });

    it('should handle execCommand with null code and signal', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      mockSSHConnection.execCommand.mockResolvedValue({
        stdout: 'output',
        stderr: '',
        code: null,
        signal: 'SIGKILL',
      });

      const result = await sshClient.executeCommand(session.sessionId, 'killed-command');

      expect(result.exitCode).toBe(-1);
    });

    it('should handle execCommand with valid exit code', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);
      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      mockSSHConnection.execCommand.mockResolvedValue({
        stdout: 'success',
        stderr: '',
        code: 0,
        signal: null,
      });

      const result = await sshClient.executeCommand(session.sessionId, 'successful-command');

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe('success');
      expect(result.error).toBe('');
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent connections', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const promises = [
        sshClient.connect(DeviceId.create('device-1'), ipAddress, port, credentials),
        sshClient.connect(DeviceId.create('device-2'), ipAddress, port, credentials),
        sshClient.connect(DeviceId.create('device-3'), ipAddress, port, credentials),
      ];

      const sessions = await Promise.all(promises);

      expect(sessions).toHaveLength(3);
      expect((sshClient as any).activeSessions.size).toBe(3);
      sessions.forEach(session => {
        expect(session.sessionId).toContain('device-');
      });
    });

    it('should handle concurrent command executions on different sessions', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const session1 = await sshClient.connect(DeviceId.create('device-1'), ipAddress, port, credentials);
      const session2 = await sshClient.connect(DeviceId.create('device-2'), ipAddress, port, credentials);

      mockSSHConnection.execCommand.mockResolvedValue({
        stdout: 'result',
        stderr: '',
        code: 0,
        signal: null,
      });

      const promises = [
        sshClient.executeCommand(session1.sessionId, 'command1'),
        sshClient.executeCommand(session2.sessionId, 'command2'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.output).toBe('result');
        expect(result.exitCode).toBe(0);
      });

      expect(mockSSHConnection.execCommand).toHaveBeenCalledTimes(2);
    });
  });
});
