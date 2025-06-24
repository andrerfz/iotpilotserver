import { describe, it, expect } from 'vitest';
import { IpAddress } from '../ip-address.vo';

describe('IpAddress Value Object', () => {
  it('should create an IpAddress with a valid value', () => {
    const ip = '192.168.1.1';
    const ipAddress = IpAddress.create(ip);
    expect(ipAddress.value).toBe(ip);
  });

  it('should throw an error when created with an empty value', () => {
    expect(() => IpAddress.create('')).toThrow('IP address cannot be empty');
    expect(() => new IpAddress('')).toThrow('IP address cannot be empty');
    expect(() => new IpAddress(null as unknown as string)).toThrow('IP address cannot be empty');
    expect(() => new IpAddress(undefined as unknown as string)).toThrow('IP address cannot be empty');
  });

  it('should throw an error when created with an invalid format', () => {
    expect(() => IpAddress.create('not-an-ip')).toThrow('Invalid IP address format');
    expect(() => IpAddress.create('192.168.1')).toThrow('Invalid IP address format');
    expect(() => IpAddress.create('192.168.1.1.1')).toThrow('Invalid IP address format');
    expect(() => IpAddress.create('192.168.1.')).toThrow('Invalid IP address format');
    expect(() => IpAddress.create('.168.1.1')).toThrow('Invalid IP address format');
  });

  it('should throw an error when octets are out of range', () => {
    expect(() => IpAddress.create('256.168.1.1')).toThrow('IP address octets must be between 0 and 255');
    expect(() => IpAddress.create('192.256.1.1')).toThrow('IP address octets must be between 0 and 255');
    expect(() => IpAddress.create('192.168.256.1')).toThrow('IP address octets must be between 0 and 255');
    expect(() => IpAddress.create('192.168.1.256')).toThrow('IP address octets must be between 0 and 255');
    expect(() => IpAddress.create('-1.168.1.1')).toThrow('Invalid IP address format');
  });

  it('should accept boundary values for octets', () => {
    expect(() => IpAddress.create('0.0.0.0')).not.toThrow();
    expect(() => IpAddress.create('255.255.255.255')).not.toThrow();
  });

  it('should correctly compare two IpAddresses for equality', () => {
    const ip1 = IpAddress.create('192.168.1.1');
    const ip2 = IpAddress.create('192.168.1.1');
    const ip3 = IpAddress.create('10.0.0.1');
    
    expect(ip1.equals(ip2)).toBe(true);
    expect(ip1.equals(ip3)).toBe(false);
    expect(ip2.equals(ip3)).toBe(false);
  });
});