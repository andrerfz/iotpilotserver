import {DeviceId} from '../device-id.vo';

describe('DeviceId Value Object', () => {
  it('should create a valid DeviceId', () => {
    const id = 'device-123';
    const deviceId = DeviceId.create(id);
    
    expect(deviceId).toBeDefined();
    expect(deviceId.toString()).toBe(id);
  });

  it('should throw an error when creating with an empty ID', () => {
    expect(() => {
      DeviceId.create('');
    }).toThrow('Device ID cannot be empty');
  });

  it('should throw an error when creating with an ID that is too short', () => {
    expect(() => {
      DeviceId.create('ab');
    }).toThrow('Device ID must be at least 3 characters long');
  });

  it('should compare two DeviceIds correctly', () => {
    const id1 = DeviceId.create('device-123');
    const id2 = DeviceId.create('device-123');
    const id3 = DeviceId.create('device-456');
    
    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });

  it('should convert to string correctly', () => {
    const id = 'device-123';
    const deviceId = DeviceId.create(id);
    
    expect(deviceId.toString()).toBe(id);
  });
});