import {IPAddress} from '../ip-address.vo';

describe('IPAddress Value Object', () => {
  it('should create a valid IPv4 address', () => {
    const ip = '192.168.1.1';
    const ipAddress = IPAddress.create(ip);
    
    expect(ipAddress).toBeDefined();
    expect(ipAddress.toString()).toBe(ip);
  });

  it('should create a valid IPv6 address', () => {
    const ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    const ipAddress = IPAddress.create(ip);
    
    expect(ipAddress).toBeDefined();
    expect(ipAddress.toString()).toBe(ip);
  });

  it('should create a valid hostname', () => {
    const hostname = 'example.com';
    const ipAddress = IPAddress.create(hostname);
    
    expect(ipAddress).toBeDefined();
    expect(ipAddress.toString()).toBe(hostname);
  });

  it('should create a valid localhost reference', () => {
    const localhost = 'localhost';
    const ipAddress = IPAddress.create(localhost);
    
    expect(ipAddress).toBeDefined();
    expect(ipAddress.toString()).toBe(localhost);
  });

  it('should throw an error when creating with an empty IP address', () => {
    expect(() => {
      IPAddress.create('');
    }).toThrow('IP address cannot be empty');
  });

  it('should throw an error when creating with an invalid IPv4 address', () => {
    expect(() => {
      IPAddress.create('192.168.1.256');
    }).toThrow('Invalid IPv4 address: octets must be between 0 and 255');
  });

  it('should throw an error when creating with an invalid format', () => {
    expect(() => {
      IPAddress.create('not-an-ip-address!');
    }).toThrow('Invalid IP address format');
  });

  it('should compare two IPAddresses correctly', () => {
    const ip1 = IPAddress.create('192.168.1.1');
    const ip2 = IPAddress.create('192.168.1.1');
    const ip3 = IPAddress.create('192.168.1.2');
    
    expect(ip1.equals(ip2)).toBe(true);
    expect(ip1.equals(ip3)).toBe(false);
  });

  it('should identify loopback addresses correctly', () => {
    const loopback1 = IPAddress.create('127.0.0.1');
    const loopback2 = IPAddress.create('::1');
    const loopback3 = IPAddress.create('localhost');
    const nonLoopback = IPAddress.create('192.168.1.1');
    
    expect(loopback1.isLoopback()).toBe(true);
    expect(loopback2.isLoopback()).toBe(true);
    expect(loopback3.isLoopback()).toBe(true);
    expect(nonLoopback.isLoopback()).toBe(false);
  });

  it('should identify private IPv4 addresses correctly', () => {
    const private1 = IPAddress.create('10.0.0.1');
    const private2 = IPAddress.create('172.16.0.1');
    const private3 = IPAddress.create('192.168.1.1');
    const public1 = IPAddress.create('8.8.8.8');
    
    expect(private1.isPrivate()).toBe(true);
    expect(private2.isPrivate()).toBe(true);
    expect(private3.isPrivate()).toBe(true);
    expect(public1.isPrivate()).toBe(false);
  });

  it('should handle IPv4 addresses with leading zeros', () => {
    const ip = IPAddress.create('192.168.001.001');
    
    expect(ip.toString()).toBe('192.168.001.001');
  });

  it('should accept valid IPv4 address at boundaries', () => {
    const minIp = IPAddress.create('0.0.0.0');
    const maxIp = IPAddress.create('255.255.255.255');
    
    expect(minIp.toString()).toBe('0.0.0.0');
    expect(maxIp.toString()).toBe('255.255.255.255');
  });
});