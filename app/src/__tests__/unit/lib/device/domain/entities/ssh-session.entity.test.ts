import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SSHSession } from '@/lib/device/domain/entities/ssh-session.entity';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
import { IpAddress } from '@/lib/device/domain/value-objects/ip-address.vo';
import { SshCredentials } from '@/lib/device/domain/value-objects/ssh-credentials.vo';

// Mock the value objects
vi.mock('@/lib/device/domain/value-objects/device-id.vo');
vi.mock('@/lib/device/domain/value-objects/ip-address.vo');
vi.mock('@/lib/device/domain/value-objects/ssh-credentials.vo');

describe('SSHSession Entity', () => {
  let sessionId: string;
  let deviceId: DeviceId;
  let ipAddress: IpAddress;
  let sshCredentials: SshCredentials;
  let sshSession: SSHSession;

  beforeEach(() => {
    // Setup mocks
    sessionId = 'session-123';
    deviceId = { getValue: 'device-123' } as unknown as DeviceId;
    ipAddress = { getValue: '192.168.1.1' } as unknown as IpAddress;
    sshCredentials = {
      username: 'user',
      password: 'pass'
    } as unknown as SshCredentials;

    // Create an SSH session instance
    sshSession = SSHSession.create(
      sessionId,
      deviceId,
      ipAddress,
      sshCredentials
    );
  });

  describe('create', () => {
    it('should create a new SSH session with the provided values', () => {
      expect(sshSession.id).toBe(sessionId);
      expect(sshSession.deviceId).toBe(deviceId);
      expect(sshSession.ipAddress).toBe(ipAddress);
      expect(sshSession.sshCredentials).toBe(sshCredentials);
      expect(sshSession.startTime).toBeInstanceOf(Date);
      expect(sshSession.endTime).toBeNull();
      expect(sshSession.isActive).toBe(true);
      expect(sshSession.commands).toEqual([]);
    });
  });

  describe('addCommand', () => {
    it('should add a command to the commands list', () => {
      const command = 'ls -la';
      sshSession.addCommand(command);

      expect(sshSession.commands).toContain(command);
      expect(sshSession.commands.length).toBe(1);
    });

    it('should add multiple commands to the commands list', () => {
      const commands = ['ls -la', 'cd /home', 'pwd'];

      commands.forEach(cmd => sshSession.addCommand(cmd));

      commands.forEach(cmd => {
        expect(sshSession.commands).toContain(cmd);
      });
      expect(sshSession.commands.length).toBe(commands.length);
    });
  });

  describe('closeSession', () => {
    it('should mark the session as inactive and set the end time', () => {
      const now = new Date();
      vi.spyOn(global, 'Date').mockImplementationOnce(() => now as unknown as string);

      sshSession.closeSession();

      expect(sshSession.isActive).toBe(false);
      expect(sshSession.endTime).toBe(now);
    });
  });

  describe('getters', () => {
    it('should return the correct id', () => {
      expect(sshSession.id).toBe(sessionId);
    });

    it('should return the correct deviceId', () => {
      expect(sshSession.deviceId).toBe(deviceId);
    });

    it('should return the correct ipAddress', () => {
      expect(sshSession.ipAddress).toBe(ipAddress);
    });

    it('should return the correct sshCredentials', () => {
      expect(sshSession.sshCredentials).toBe(sshCredentials);
    });

    it('should return a copy of the commands array', () => {
      const command = 'ls -la';
      sshSession.addCommand(command);

      const commands = sshSession.commands;
      commands.push('cd /home');

      expect(sshSession.commands).not.toContain('cd /home');
      expect(sshSession.commands.length).toBe(1);
    });
  });
});
