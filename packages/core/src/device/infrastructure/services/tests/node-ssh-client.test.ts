import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NodeSSHClient} from '../node-ssh-client';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {IpAddress} from '../../../domain/value-objects/ip-address.vo';
import {Port} from '../../../domain/value-objects/port.vo';
import {SshCredentials} from '../../../domain/value-objects/ssh-credentials.vo';

// Mock NodeSSH - use vi.hoisted so mocks exist before vi.mock factory runs
const { mockSSHConnection, mockNodeSSH } = vi.hoisted(() => {
  const conn = {
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
  const mock = vi.fn().mockImplementation(() => conn);
  return { mockSSHConnection: conn, mockNodeSSH: mock };
});

vi.mock('node-ssh', () => ({
  NodeSSH: mockNodeSSH,
}));

// Mock crypto - use importOriginal to preserve default export and other methods
// Put our override AFTER the spread so it takes precedence
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomUUID: () => 'mock-uuid-123',
  };
});

describe.skip('NodeSSHClient', () => {
  let sshClient: NodeSSHClient;
  let deviceId: DeviceId;
  let ipAddress: IpAddress;
  let port: Port;
  let credentials: SshCredentials;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    sshClient = new NodeSSHClient();
    deviceId = DeviceId.create('device-1');
    ipAddress = IpAddress.create('192.168.1.100');
    port = Port.create(22);
    credentials = SshCredentials.create('testuser', 'testpass');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connect', () => {
    it.skip('should establish SSH connection with password authentication', async () => {
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
    });

    it.skip('should establish SSH connection with private key authentication', async () => {
      const keyCredentials = SshCredentials.createWithKey('testuser', 'private-key-content');
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const session = await sshClient.connect(deviceId, ipAddress, port, keyCredentials);

      expect(mockSSHConnection.connect).toHaveBeenCalledWith({
        host: '192.168.1.100',
        port: 22,
        username: 'testuser',
        privateKey: 'private-key-content',
        readyTimeout: 30000,
        keepaliveInterval: 10000,
      });

      expect(session).toBeDefined();
    });

    it('should throw error when neither password nor private key is provided', async () => {
      // Create credentials without password or key
      const invalidCredentials = {
        getUsername: () => 'testuser',
        getPassword: () => null,
        getPrivateKey: () => null,
      } as any;

      await expect(sshClient.connect(deviceId, ipAddress, port, invalidCredentials))
        .rejects.toThrow('No authentication method provided');
    });

    it.skip('should handle connection errors', async () => {
      mockSSHConnection.connect.mockRejectedValue(new Error('Connection refused'));

      await expect(sshClient.connect(deviceId, ipAddress, port, credentials))
        .rejects.toThrow('SSH connection failed: Connection refused');
    });

    it.skip('should store session in sessions map', async () => {
      mockSSHConnection.connect.mockResolvedValue(undefined);

      const session = await sshClient.connect(deviceId, ipAddress, port, credentials);

      const sessions = (sshClient as any).sessions;
      expect(sessions.has(session.id.value)).toBe(true);
      expect(sessions.get(session.id.value)).toEqual({
        ssh: mockSSHConnection,
        session,
        lastActivity: expect.any(Date),
      });
    });
  });

  describe('executeCommand', () => {
    it('should execute command and return result', async () => {
      const sessionId = 'session-123';
      const command = 'ls -la';

      // Mock existing session
      const mockSession = {
        id: { value: sessionId },
        deviceId,
        ipAddress,
        credentials,
      };

      (sshClient as any).sessions.set(sessionId, {
        ssh: mockSSHConnection,
        session: mockSession,
        lastActivity: new Date(),
      });

      mockSSHConnection.execCommand.mockResolvedValue({
        stdout: 'file1.txt\nfile2.txt',
        stderr: '',
        code: 0,
        signal: null,
      });

      const result = await sshClient.executeCommand(sessionId, command);

      expect(mockSSHConnection.execCommand).toHaveBeenCalledWith(command);
      expect(result).toEqual({
        output: 'file1.txt\nfile2.txt',
        error: null,
      });

      // Should update last activity
      const sessionData = (sshClient as any).sessions.get(sessionId);
      expect(sessionData.lastActivity).toEqual(expect.any(Date));
    });

    it('should throw error for non-existent session', async () => {
      await expect(sshClient.executeCommand('non-existent-session', 'ls'))
        .rejects.toThrow('Session session-123 not found');
    });

    it('should handle command execution errors', async () => {
      const sessionId = 'session-123';

      (sshClient as any).sessions.set(sessionId, {
        ssh: mockSSHConnection,
        session: { id: { value: sessionId } },
        lastActivity: new Date(),
      });

      mockSSHConnection.execCommand.mockRejectedValue(new Error('Command failed'));

      await expect(sshClient.executeCommand(sessionId, 'invalid-command'))
        .rejects.toThrow('SSH command execution failed: Command failed');
    });

    it('should handle command stderr output', async () => {
      const sessionId = 'session-123';

      (sshClient as any).sessions.set(sessionId, {
        ssh: mockSSHConnection,
        session: { id: { value: sessionId } },
        lastActivity: new Date(),
      });

      mockSSHConnection.execCommand.mockResolvedValue({
        stdout: 'some output',
        stderr: 'warning: some issue',
        code: 1,
        signal: null,
      });

      const result = await sshClient.executeCommand(sessionId, 'problematic-command');

      expect(result).toEqual({
        output: 'some output',
        error: 'warning: some issue',
        exitCode: 1,
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect and remove session', async () => {
      const sessionId = 'session-123';

      (sshClient as any).sessions.set(sessionId, {
        ssh: mockSSHConnection,
        session: { id: { value: sessionId } },
        lastActivity: new Date(),
      });

      await sshClient.disconnect(sessionId);

      expect(mockSSHConnection.dispose).toHaveBeenCalled();
      expect((sshClient as any).sessions.has(sessionId)).toBe(false);
    });

    it('should handle disconnection of non-existent session gracefully', async () => {
      await expect(sshClient.disconnect('non-existent-session')).resolves.not.toThrow();
    });
  });

  describe('isConnected', () => {
    it('should return true for active session', async () => {
      const sessionId = 'session-123';

      (sshClient as any).sessions.set(sessionId, {
        ssh: mockSSHConnection,
        session: { id: { value: sessionId } },
        lastActivity: new Date(),
      });

      const result = await sshClient.isConnected(sessionId);
      expect(result).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      const result = await sshClient.isConnected('non-existent-session');
      expect(result).toBe(false);
    });
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions', async () => {
      const session1 = { id: { value: 'session-1' }, deviceId: DeviceId.create('device-1') };
      const session2 = { id: { value: 'session-2' }, deviceId: DeviceId.create('device-2') };

      (sshClient as any).sessions.set('session-1', {
        ssh: mockSSHConnection,
        session: session1,
        lastActivity: new Date(),
      });

      (sshClient as any).sessions.set('session-2', {
        ssh: mockSSHConnection,
        session: session2,
        lastActivity: new Date(),
      });

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
      const sessionId = 'session-123';
      const mockSession = {
        id: { value: sessionId },
        deviceId,
        ipAddress,
        credentials,
        connectedAt: new Date('2023-01-01T10:00:00Z'),
      };
      const lastActivity = new Date('2023-01-01T10:30:00Z');

      (sshClient as any).sessions.set(sessionId, {
        ssh: mockSSHConnection,
        session: mockSession,
        lastActivity,
      });

      const info = await sshClient.getSessionInfo(sessionId);

      expect(info).toEqual({
        sessionId,
        deviceId: 'device-1',
        ipAddress: '192.168.1.100',
        username: 'testuser',
        connectedAt: mockSession.connectedAt,
        lastActivity,
      });
    });

    it('should return null for non-existent session', async () => {
      const info = await sshClient.getSessionInfo('non-existent-session');
      expect(info).toBeNull();
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('should remove sessions that have exceeded timeout', () => {
      const activeSessionId = 'active-session';
      const inactiveSessionId = 'inactive-session';

      const now = new Date();
      const timeoutThreshold = now.getTime() - (30 * 60 * 1000) - 1000; // 30 minutes + 1 second ago

      (sshClient as any).sessions.set(activeSessionId, {
        ssh: mockSSHConnection,
        session: { id: { value: activeSessionId } },
        lastActivity: now, // Recent activity
      });

      (sshClient as any).sessions.set(inactiveSessionId, {
        ssh: { ...mockSSHConnection },
        session: { id: { value: inactiveSessionId } },
        lastActivity: new Date(timeoutThreshold), // Old activity
      });

      (sshClient as any).cleanupInactiveSessions();

      expect((sshClient as any).sessions.has(activeSessionId)).toBe(true);
      expect((sshClient as any).sessions.has(inactiveSessionId)).toBe(false);
    });

    it('should dispose SSH connections for cleaned up sessions', () => {
      const inactiveSessionId = 'inactive-session';
      const mockSSHForCleanup = { ...mockSSHConnection, dispose: vi.fn() };

      const timeoutThreshold = new Date().getTime() - (30 * 60 * 1000) - 1000;

      (sshClient as any).sessions.set(inactiveSessionId, {
        ssh: mockSSHForCleanup,
        session: { id: { value: inactiveSessionId } },
        lastActivity: new Date(timeoutThreshold),
      });

      (sshClient as any).cleanupInactiveSessions();

      expect(mockSSHForCleanup.dispose).toHaveBeenCalled();
    });
  });

  describe('session timeout configuration', () => {
    it('should use 30 minute session timeout', () => {
      expect((sshClient as any).sessionTimeout).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
    });
  });

  describe('periodic cleanup', () => {
    it('should set up cleanup interval on construction', () => {
      // The constructor sets up setInterval, but we can't easily test the interval
      // We can verify that the cleanup method exists and is callable
      expect(typeof (sshClient as any).cleanupInactiveSessions).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle SSH connection disposal errors gracefully', async () => {
      const sessionId = 'session-123';

      (sshClient as any).sessions.set(sessionId, {
        ssh: mockSSHConnection,
        session: { id: { value: sessionId } },
        lastActivity: new Date(),
      });

      mockSSHConnection.dispose.mockRejectedValue(new Error('Dispose failed'));

      // Should not throw
      await expect(sshClient.disconnect(sessionId)).resolves.not.toThrow();

      // Session should still be removed
      expect((sshClient as any).sessions.has(sessionId)).toBe(false);
    });

    it('should handle execCommand with signal termination', async () => {
      const sessionId = 'session-123';

      (sshClient as any).sessions.set(sessionId, {
        ssh: mockSSHConnection,
        session: { id: { value: sessionId } },
        lastActivity: new Date(),
      });

      mockSSHConnection.execCommand.mockResolvedValue({
        stdout: '',
        stderr: '',
        code: null,
        signal: 'SIGTERM',
      });

      const result = await sshClient.executeCommand(sessionId, 'killed-command');

      expect(result).toEqual({
        output: '',
        error: '',
        exitCode: -1, // Signal termination
      });
    });
  });
});
