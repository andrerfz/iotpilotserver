import { DeviceName } from '@/lib/device/domain/value-objects/device-name.vo';

describe('DeviceName Value Object', () => {
  describe('constructor', () => {
    it('should create a DeviceName with the provided value', () => {
      const name = 'Test Device';
      const deviceName = new DeviceName(name);
      
      expect(deviceName.value).toBe(name);
    });
    
    it('should throw an error if the value is empty', () => {
      expect(() => new DeviceName('')).toThrow('Device name cannot be empty');
    });
    
    it('should throw an error if the value is less than 3 characters', () => {
      expect(() => new DeviceName('AB')).toThrow('Device name must be at least 3 characters long');
    });
    
    it('should throw an error if the value is more than 50 characters', () => {
      const longName = 'A'.repeat(51);
      expect(() => new DeviceName(longName)).toThrow('Device name cannot exceed 50 characters');
    });
    
    it('should accept a name with exactly 3 characters', () => {
      const name = 'ABC';
      const deviceName = new DeviceName(name);
      
      expect(deviceName.value).toBe(name);
    });
    
    it('should accept a name with exactly 50 characters', () => {
      const name = 'A'.repeat(50);
      const deviceName = new DeviceName(name);
      
      expect(deviceName.value).toBe(name);
    });
  });
  
  describe('create', () => {
    it('should create a DeviceName with the provided value', () => {
      const name = 'Test Device';
      const deviceName = DeviceName.create(name);
      
      expect(deviceName.value).toBe(name);
    });
    
    it('should throw an error if the value is empty', () => {
      expect(() => DeviceName.create('')).toThrow('Device name cannot be empty');
    });
    
    it('should throw an error if the value is less than 3 characters', () => {
      expect(() => DeviceName.create('AB')).toThrow('Device name must be at least 3 characters long');
    });
    
    it('should throw an error if the value is more than 50 characters', () => {
      const longName = 'A'.repeat(51);
      expect(() => DeviceName.create(longName)).toThrow('Device name cannot exceed 50 characters');
    });
  });
  
  describe('equals', () => {
    it('should return true if the names are equal', () => {
      const name = 'Test Device';
      const deviceName1 = DeviceName.create(name);
      const deviceName2 = DeviceName.create(name);
      
      expect(deviceName1.equals(deviceName2)).toBe(true);
    });
    
    it('should return false if the names are not equal', () => {
      const deviceName1 = DeviceName.create('Device 1');
      const deviceName2 = DeviceName.create('Device 2');
      
      expect(deviceName1.equals(deviceName2)).toBe(false);
    });
  });
});