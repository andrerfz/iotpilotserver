import {DeviceCommand} from '../device-command.entity';

describe('DeviceCommand Entity', () => {
  it('should create a device command with valid name and payload', () => {
    const command = new DeviceCommand('Reboot', { delay: '5m' });

    expect(command.commandName).toBe('Reboot');
    expect(command.payload).toEqual({ delay: '5m' });
  });
});