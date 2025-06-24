import { describe, it, expect, beforeEach } from 'vitest';
import { SSHSession } from '../ssh-session.entity';
import { DeviceId } from '../../value-objects/device-id.vo';
import { IpAddress } from '../../value-objects/ip-address.vo';
import { SshCredentials } from '../../value-objects/ssh-credentials.vo';

describe('SSHSession Entity', () => {
  let sessionId: string;
  let deviceId: DeviceId;
  let ipAddress: IpAddress;
  let sshCredentials: SshCredentials;
  let sshSession: SSHSession;

  beforeEach(() => {
    sessionId = 'session-123';
    deviceId = DeviceId.create('device-123');
    ipAddress = IpAddress.create('192.168.1.1');
    sshCredentials = SshCredentials.create('user', 'password');
    sshSession = SSHSession.create(sessionId, deviceId, ipAddress, sshCredentials);
  });

  it('should create an SSH session with correct values', () => {
    expect(sshSession.id).toBe(sessionId);
    expect(sshSession.deviceId).toBe(deviceId);
    expect(sshSession.ipAddress).toBe(ipAddress);
    expect(sshSession.sshCredentials).toBe(sshCredentials);
    expect(sshSession.startTime).toBeInstanceOf(Date);
    expect(sshSession.endTime).toBeNull();
    expect(sshSession.isActive).toBe(true);
    expect(sshSession.commands).toEqual([]);
  });

  it('should add commands to the session', () => {
    const command1 = 'ls -la';
    const command2 = 'cd /home';
    
    sshSession.addCommand(command1);
    expect(sshSession.commands).toEqual([command1]);
    
    sshSession.addCommand(command2);
    expect(sshSession.commands).toEqual([command1, command2]);
  });

  it('should return a copy of commands array to prevent direct modification', () => {
    sshSession.addCommand('ls -la');
    
    // Get the commands array
    const commands = sshSession.commands;
    
    // Try to modify it directly
    commands.push('cd /home');
    
    // The original commands array in the session should not be modified
    expect(sshSession.commands).toEqual(['ls -la']);
  });

  it('should close the session', () => {
    expect(sshSession.isActive).toBe(true);
    expect(sshSession.endTime).toBeNull();
    
    sshSession.closeSession();
    
    expect(sshSession.isActive).toBe(false);
    expect(sshSession.endTime).toBeInstanceOf(Date);
    
    // The end time should be very recent (within the last second)
    const now = new Date();
    const timeDifference = now.getTime() - sshSession.endTime!.getTime();
    expect(timeDifference).toBeLessThan(1000);
  });
});