import {DeviceName} from '../device-name.vo';

describe('DeviceName Value Object', () => {
  it('should create a valid DeviceName', () => {
    const name = 'Test Device';
    const deviceName = DeviceName.create(name);
    
    expect(deviceName).toBeDefined();
    expect(deviceName.toString()).toBe(name);
  });

  it('should throw an error when creating with an empty name', () => {
    expect(() => {
      DeviceName.create('');
    }).toThrow('Device name cannot be empty');
  });

  it('should throw an error when creating with a name that is too short', () => {
    expect(() => {
      DeviceName.create('A');
    }).toThrow('Device name must be at least 2 characters long');
  });

  it('should throw an error when creating with a name that is too long', () => {
    const longName = 'A'.repeat(51);
    expect(() => {
      DeviceName.create(longName);
    }).toThrow('Device name cannot exceed 50 characters');
  });

  it('should compare two DeviceNames correctly', () => {
    const name1 = DeviceName.create('Test Device');
    const name2 = DeviceName.create('Test Device');
    const name3 = DeviceName.create('Another Device');
    
    expect(name1.equals(name2)).toBe(true);
    expect(name1.equals(name3)).toBe(false);
  });

  it('should convert to string correctly', () => {
    const name = 'Test Device';
    const deviceName = DeviceName.create(name);
    
    expect(deviceName.toString()).toBe(name);
  });

  it('should accept names with special characters', () => {
    const name = 'Test-Device_123';
    const deviceName = DeviceName.create(name);
    
    expect(deviceName.toString()).toBe(name);
  });

  it('should accept names with spaces', () => {
    const name = 'Test Device 123';
    const deviceName = DeviceName.create(name);
    
    expect(deviceName.toString()).toBe(name);
  });

  it('should accept names with minimum valid length', () => {
    const name = 'AB';
    const deviceName = DeviceName.create(name);
    
    expect(deviceName.toString()).toBe(name);
  });

  it('should accept names with maximum valid length', () => {
    const name = 'A'.repeat(50);
    const deviceName = DeviceName.create(name);
    
    expect(deviceName.toString()).toBe(name);
  });
});