import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceCommand, CommandStatus } from '../device-command.entity';
import { DeviceId } from '@/lib/device/value-objects/device-id.vo';

describe('DeviceCommand Entity', () => {
  let commandId: string;
  let deviceId: DeviceId;
  let commandText: string;
  let deviceCommand: DeviceCommand;

  beforeEach(() => {
    commandId = 'command-123';
    deviceId = DeviceId.fromString('device-123');
    commandText = 'ls -la';
    deviceCommand = DeviceCommand.create(commandId, deviceId, commandText);
  });

  it('should create a device command with correct values', () => {
    expect(deviceCommand.id).toBe(commandId);
    expect(deviceCommand.deviceId).toBe(deviceId);
    expect(deviceCommand.command).toBe(commandText);
    expect(deviceCommand.status).toBe(CommandStatus.PENDING);
    expect(deviceCommand.output).toBeNull();
    expect(deviceCommand.error).toBeNull();
    expect(deviceCommand.createdAt).toBeInstanceOf(Date);
    expect(deviceCommand.executedAt).toBeNull();
    expect(deviceCommand.completedAt).toBeNull();
  });

  it('should mark command as executing', () => {
    expect(deviceCommand.status).toBe(CommandStatus.PENDING);
    expect(deviceCommand.executedAt).toBeNull();

    deviceCommand.markAsExecuting();

    expect(deviceCommand.status).toBe(CommandStatus.EXECUTING);
    expect(deviceCommand.executedAt).toBeInstanceOf(Date);
    expect(deviceCommand.completedAt).toBeNull();

    // The executed time should be very recent (within the last second)
    const now = new Date();
    const timeDifference = now.getTime() - deviceCommand.executedAt!.getTime();
    expect(timeDifference).toBeLessThan(1000);
  });

  it('should mark command as completed', () => {
    const output = 'Command output';

    deviceCommand.markAsExecuting();
    deviceCommand.markAsCompleted(output);

    expect(deviceCommand.status).toBe(CommandStatus.COMPLETED);
    expect(deviceCommand.output).toBe(output);
    expect(deviceCommand.error).toBeNull();
    expect(deviceCommand.completedAt).toBeInstanceOf(Date);

    // The completed time should be very recent (within the last second)
    const now = new Date();
    const timeDifference = now.getTime() - deviceCommand.completedAt!.getTime();
    expect(timeDifference).toBeLessThan(1000);
  });

  it('should mark command as failed', () => {
    const error = 'Command failed: Permission denied';

    deviceCommand.markAsExecuting();
    deviceCommand.markAsFailed(error);

    expect(deviceCommand.status).toBe(CommandStatus.FAILED);
    expect(deviceCommand.output).toBeNull();
    expect(deviceCommand.error).toBe(error);
    expect(deviceCommand.completedAt).toBeInstanceOf(Date);

    // The completed time should be very recent (within the last second)
    const now = new Date();
    const timeDifference = now.getTime() - deviceCommand.completedAt!.getTime();
    expect(timeDifference).toBeLessThan(1000);
  });

  it('should allow marking as failed without executing first', () => {
    const error = 'Failed to connect to device';

    deviceCommand.markAsFailed(error);

    expect(deviceCommand.status).toBe(CommandStatus.FAILED);
    expect(deviceCommand.error).toBe(error);
    expect(deviceCommand.executedAt).toBeNull();
    expect(deviceCommand.completedAt).toBeInstanceOf(Date);
  });
});
