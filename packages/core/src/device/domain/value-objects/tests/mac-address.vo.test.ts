import { describe, it, expect } from 'vitest';
import { MACAddress } from '../mac-address.vo';

describe('MACAddress Value Object', () => {
  it('should create a MACAddress with a valid colon-separated format', () => {
    const mac = '00:1A:2B:3C:4D:5E';
    const macAddress = MACAddress.create(mac);
    expect(macAddress.getValue).toBe(mac);
  });

  it('should create a MACAddress with a valid hyphen-separated format', () => {
    const mac = '00-1A-2B-3C-4D-5E';
    const macAddress = MACAddress.create(mac);
    expect(macAddress.getValue).toBe(mac);
  });

  it('should throw an error when created with an invalid format', () => {
    expect(() => MACAddress.create('')).toThrow('Invalid MAC address format');
    expect(() => MACAddress.create('not-a-mac')).toThrow('Invalid MAC address format');
    expect(() => MACAddress.create('00:1A:2B:3C:4D')).toThrow('Invalid MAC address format');
    expect(() => MACAddress.create('00:1A:2B:3C:4D:5E:6F')).toThrow('Invalid MAC address format');
    expect(() => MACAddress.create('00:1A:2B:3C:4D:5Z')).toThrow('Invalid MAC address format');
    expect(() => MACAddress.create('001A2B3C4D5E')).toThrow('Invalid MAC address format');
    expect(() => MACAddress.create('00:1A:2B-3C-4D-5E')).toThrow('Invalid MAC address format');
  });

  it('should validate MAC addresses correctly', () => {
    // Valid formats
    expect(MACAddress.isValid('00:1A:2B:3C:4D:5E')).toBe(true);
    expect(MACAddress.isValid('00-1A-2B-3C-4D-5E')).toBe(true);
    expect(MACAddress.isValid('FF:FF:FF:FF:FF:FF')).toBe(true);
    expect(MACAddress.isValid('ff:ff:ff:ff:ff:ff')).toBe(true);
    
    // Invalid formats
    expect(MACAddress.isValid('')).toBe(false);
    expect(MACAddress.isValid('not-a-mac')).toBe(false);
    expect(MACAddress.isValid('00:1A:2B:3C:4D')).toBe(false);
    expect(MACAddress.isValid('00:1A:2B:3C:4D:5E:6F')).toBe(false);
    expect(MACAddress.isValid('00:1A:2B:3C:4D:5Z')).toBe(false);
    expect(MACAddress.isValid('001A2B3C4D5E')).toBe(false);
    expect(MACAddress.isValid('00:1A:2B-3C-4D-5E')).toBe(false);
  });

  it('should correctly compare two MACAddresses for equality', () => {
    const mac1 = MACAddress.create('00:1A:2B:3C:4D:5E');
    const mac2 = MACAddress.create('00:1A:2B:3C:4D:5E');
    const mac3 = MACAddress.create('FF:FF:FF:FF:FF:FF');
    
    expect(mac1.equals(mac2)).toBe(true);
    expect(mac1.equals(mac3)).toBe(false);
    expect(mac2.equals(mac3)).toBe(false);
  });

  it('should convert to string correctly', () => {
    const mac = '00:1A:2B:3C:4D:5E';
    const macAddress = MACAddress.create(mac);
    expect(macAddress.toString()).toBe(mac);
  });
});