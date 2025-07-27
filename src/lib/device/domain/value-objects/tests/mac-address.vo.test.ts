import {MACAddress} from '../mac-address.vo';

describe('MACAddress Value Object', () => {
  it('should create a valid MAC address with colon format', () => {
    const mac = '00:1A:2B:3C:4D:5E';
    const macAddress = MACAddress.create(mac);
    
    expect(macAddress).toBeDefined();
    expect(macAddress.toString()).toBe(mac);
  });

  it('should create a valid MAC address with hyphen format', () => {
    const mac = '00-1A-2B-3C-4D-5E';
    const macAddress = MACAddress.create(mac);
    
    expect(macAddress).toBeDefined();
    expect(macAddress.toString()).toBe(mac);
  });

  it('should create a valid MAC address with no separators', () => {
    const mac = '001A2B3C4D5E';
    const macAddress = MACAddress.create(mac);
    
    expect(macAddress).toBeDefined();
    expect(macAddress.toString()).toBe(mac);
  });

  it('should throw an error when creating with an empty MAC address', () => {
    expect(() => {
      MACAddress.create('');
    }).toThrow('MAC address cannot be empty');
  });

  it('should throw an error when creating with an invalid MAC address format', () => {
    expect(() => {
      MACAddress.create('not-a-mac-address');
    }).toThrow('Invalid MAC address format');
  });

  it('should throw an error when creating with a broadcast MAC address', () => {
    expect(() => {
      MACAddress.create('FF:FF:FF:FF:FF:FF');
    }).toThrow('Broadcast MAC address is not allowed');
  });

  it('should throw an error when creating with a null MAC address', () => {
    expect(() => {
      MACAddress.create('00:00:00:00:00:00');
    }).toThrow('Null MAC address is not allowed');
  });

  it('should compare two MACAddresses correctly', () => {
    const mac1 = MACAddress.create('00:1A:2B:3C:4D:5E');
    const mac2 = MACAddress.create('00:1A:2B:3C:4D:5E');
    const mac3 = MACAddress.create('00:1A:2B:3C:4D:5F');
    
    expect(mac1.equals(mac2)).toBe(true);
    expect(mac1.equals(mac3)).toBe(false);
  });

  it('should compare MACAddresses with different formats correctly', () => {
    const mac1 = MACAddress.create('00:1A:2B:3C:4D:5E');
    const mac2 = MACAddress.create('00-1A-2B-3C-4D-5E');
    const mac3 = MACAddress.create('001A2B3C4D5E');
    
    expect(mac1.equals(mac2)).toBe(true);
    expect(mac1.equals(mac3)).toBe(true);
  });

  it('should format MAC address correctly', () => {
    const mac = MACAddress.create('001A2B3C4D5E');
    
    expect(mac.toFormattedString()).toBe('00:1a:2b:3c:4d:5e');
  });

  it('should identify unicast MAC addresses correctly', () => {
    const unicast = MACAddress.create('00:1A:2B:3C:4D:5E');
    const multicast = MACAddress.create('01:1A:2B:3C:4D:5E');
    
    expect(unicast.isUnicast()).toBe(true);
    expect(multicast.isUnicast()).toBe(false);
  });

  it('should identify multicast MAC addresses correctly', () => {
    const unicast = MACAddress.create('00:1A:2B:3C:4D:5E');
    const multicast = MACAddress.create('01:1A:2B:3C:4D:5E');
    
    expect(unicast.isMulticast()).toBe(false);
    expect(multicast.isMulticast()).toBe(true);
  });

  it('should identify locally administered MAC addresses correctly', () => {
    const global = MACAddress.create('00:1A:2B:3C:4D:5E');
    const local = MACAddress.create('02:1A:2B:3C:4D:5E');
    
    expect(global.isLocallyAdministered()).toBe(false);
    expect(local.isLocallyAdministered()).toBe(true);
  });

  it('should identify globally unique MAC addresses correctly', () => {
    const global = MACAddress.create('00:1A:2B:3C:4D:5E');
    const local = MACAddress.create('02:1A:2B:3C:4D:5E');
    
    expect(global.isGloballyUnique()).toBe(true);
    expect(local.isGloballyUnique()).toBe(false);
  });

  it('should handle MAC addresses with mixed case', () => {
    const mac = MACAddress.create('00:1a:2B:3c:4D:5e');
    
    expect(mac.toString()).toBe('00:1a:2B:3c:4D:5e');
    expect(mac.equals(MACAddress.create('00:1A:2B:3C:4D:5E'))).toBe(true);
  });
});