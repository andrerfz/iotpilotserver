import { MACAddress } from '@/lib/device/domain/value-objects/mac-address.vo';

describe('MACAddress Value Object', () => {
  describe('constructor', () => {
    it('should create a MACAddress with the provided value', () => {
      const mac = '00:1A:2B:3C:4D:5E';
      const macAddress = MACAddress.create(mac);
      
      expect(macAddress.getValue).toBe(mac);
    });
  });
  
  describe('create', () => {
    it('should create a MACAddress with the provided value', () => {
      const mac = '00:1A:2B:3C:4D:5E';
      const macAddress = MACAddress.create(mac);
      
      expect(macAddress.getValue).toBe(mac);
    });
    
    it('should throw an error if the value is not a valid MAC address format', () => {
      expect(() => MACAddress.create('invalid')).toThrow('Invalid MAC address format');
      expect(() => MACAddress.create('00:1A:2B:3C:4D')).toThrow('Invalid MAC address format');
      expect(() => MACAddress.create('00:1A:2B:3C:4D:5E:6F')).toThrow('Invalid MAC address format');
      expect(() => MACAddress.create('00:1A:2B:3C:4D:ZZ')).toThrow('Invalid MAC address format');
    });
    
    it('should accept MAC addresses with colons', () => {
      const mac = '00:1A:2B:3C:4D:5E';
      const macAddress = MACAddress.create(mac);
      
      expect(macAddress.getValue).toBe(mac);
    });
    
    it('should accept MAC addresses with hyphens', () => {
      const mac = '00-1A-2B-3C-4D-5E';
      const macAddress = MACAddress.create(mac);
      
      expect(macAddress.getValue).toBe(mac);
    });
    
    it('should accept MAC addresses with lowercase letters', () => {
      const mac = '00:1a:2b:3c:4d:5e';
      const macAddress = MACAddress.create(mac);
      
      expect(macAddress.getValue).toBe(mac);
    });
    
    it('should accept MAC addresses with uppercase letters', () => {
      const mac = '00:1A:2B:3C:4D:5E';
      const macAddress = MACAddress.create(mac);
      
      expect(macAddress.getValue).toBe(mac);
    });
  });
  
  describe('isValid', () => {
    it('should return true for valid MAC addresses with colons', () => {
      expect(MACAddress.isValid('00:1A:2B:3C:4D:5E')).toBe(true);
      expect(MACAddress.isValid('FF:FF:FF:FF:FF:FF')).toBe(true);
      expect(MACAddress.isValid('00:00:00:00:00:00')).toBe(true);
    });
    
    it('should return true for valid MAC addresses with hyphens', () => {
      expect(MACAddress.isValid('00-1A-2B-3C-4D-5E')).toBe(true);
      expect(MACAddress.isValid('FF-FF-FF-FF-FF-FF')).toBe(true);
      expect(MACAddress.isValid('00-00-00-00-00-00')).toBe(true);
    });
    
    it('should return false for invalid MAC addresses', () => {
      expect(MACAddress.isValid('invalid')).toBe(false);
      expect(MACAddress.isValid('00:1A:2B:3C:4D')).toBe(false);
      expect(MACAddress.isValid('00:1A:2B:3C:4D:5E:6F')).toBe(false);
      expect(MACAddress.isValid('00:1A:2B:3C:4D:ZZ')).toBe(false);
    });
  });
  
  describe('equals', () => {
    it('should return true if the MAC addresses are equal', () => {
      const mac = '00:1A:2B:3C:4D:5E';
      const macAddress1 = MACAddress.create(mac);
      const macAddress2 = MACAddress.create(mac);
      
      expect(macAddress1.equals(macAddress2)).toBe(true);
    });
    
    it('should return false if the MAC addresses are not equal', () => {
      const macAddress1 = MACAddress.create('00:1A:2B:3C:4D:5E');
      const macAddress2 = MACAddress.create('FF:FF:FF:FF:FF:FF');
      
      expect(macAddress1.equals(macAddress2)).toBe(false);
    });
  });
  
  describe('toString', () => {
    it('should return the string representation of the MAC address', () => {
      const mac = '00:1A:2B:3C:4D:5E';
      const macAddress = MACAddress.create(mac);
      
      expect(macAddress.toString()).toBe(mac);
    });
  });
});