import { describe, it, expect } from 'vitest';
import { IpAddress } from '../ip-address.vo';

describe('IpAddress Value Object', () => {
  it('should create an IpAddress with a valid value', () => {
    const ip = '192.168.1.1';
    const ipAddress = IpAddress.create(ip);
    expect(ipAddress.value).toBe(ip);
  });

  it('should throw an error when created with an empty value', () => {
    expect(() => IpAddress.create('')).toThrow();
    expect(() => IpAddress.create(null as unknown as string)).toThrow();
    expect(() => IpAddress.create(undefined as unknown as string)).toThrow();
  });

  it('should throw an error when created with an invalid format', () => {
    expect(() => IpAddress.create('not-an-ip')).toThrow();
    expect(() => IpAddress.create('192.168.1')).toThrow();
    expect(() => IpAddress.create('192.168.1.1.1')).toThrow();
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
  });

  it('should support fromString factory method', () => {
    const ipAddress = IpAddress.fromString('10.0.0.1');
    expect(ipAddress.getValue()).toBe('10.0.0.1');
  });
});
