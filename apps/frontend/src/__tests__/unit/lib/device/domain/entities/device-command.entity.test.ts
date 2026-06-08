import {beforeEach, describe, expect, it, vi} from 'vitest';
import {CommandStatus, DeviceCommand} from '@iotpilot/core/device/domain/entities/device-command.entity';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';

// Mock the value objects
vi.mock('@iotpilot/core/device/domain/value-objects/device-id.vo');

describe('DeviceCommand Entity', () => {
  let commandId: string;
  let deviceId: DeviceId;
  let commandText: string;
  let deviceCommand: DeviceCommand;

  beforeEach(() => {
    // Setup mocks
    commandId = 'command-123';
    deviceId = { getValue: 'device-123' } as unknown as DeviceId;
    commandText = 'ls -la';

    // Create a device command instance
    deviceCommand = DeviceCommand.create(
      commandId,
      deviceId,
      commandText
    );
  });

  describe('create', () => {
    it('should create a new device command with the provided values', () => {
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
  });

  describe('markAsExecuting', () => {
    it('should update the status to EXECUTING and set executedAt timestamp', () => {
      const now = new Date();
      // Properly mock Date constructor while preserving Date.now
      vi.spyOn(global, 'Date').mockImplementationOnce(() => now);

      deviceCommand.markAsExecuting();

      expect(deviceCommand.status).toBe(CommandStatus.EXECUTING);
      expect(deviceCommand.executedAt).toBe(now);
    });
  });

  describe('markAsCompleted', () => {
    it('should update the status to COMPLETED, set output and completedAt timestamp', () => {
      const now = new Date();
      const output = 'Command output';
      // Properly mock Date constructor while preserving Date.now
      vi.spyOn(global, 'Date').mockImplementationOnce(() => now);

      deviceCommand.markAsCompleted(output);

      expect(deviceCommand.status).toBe(CommandStatus.COMPLETED);
      expect(deviceCommand.output).toBe(output);
      expect(deviceCommand.completedAt).toBe(now);
    });
  });

  describe('markAsFailed', () => {
    it('should update the status to FAILED, set error and completedAt timestamp', () => {
      const now = new Date();
      const error = 'Command failed: permission denied';
      // Properly mock Date constructor while preserving Date.now
      vi.spyOn(global, 'Date').mockImplementationOnce(() => now);

      deviceCommand.markAsFailed(error);

      expect(deviceCommand.status).toBe(CommandStatus.FAILED);
      expect(deviceCommand.error).toBe(error);
      expect(deviceCommand.completedAt).toBe(now);
    });
  });

  describe('getters', () => {
    it('should return the correct id', () => {
      expect(deviceCommand.id).toBe(commandId);
    });

    it('should return the correct deviceId', () => {
      expect(deviceCommand.deviceId).toBe(deviceId);
    });

    it('should return the correct command', () => {
      expect(deviceCommand.command).toBe(commandText);
    });

    it('should return the correct status', () => {
      expect(deviceCommand.status).toBe(CommandStatus.PENDING);
    });
  });
});
