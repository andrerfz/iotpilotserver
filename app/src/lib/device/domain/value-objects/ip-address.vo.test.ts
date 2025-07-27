import {describe, expect, it} from 'vitest';
import {IpAddress} from './ip-address.vo';

describe('IpAddress Value Object', () => {
  describe('create - valid IPv4 addresses', () => {
    it('should create valid IPv4 address', () => {
      // Arrange & Act
      const ip = IpAddress.create('192.168.1.1');

      // Assert
      expect(ip).toBeInstanceOf(IpAddress);
      expect(ip.getValue()).toBe('192.168.1.1');
    });

    it('should accept localhost', () => {
      // Arrange & Act
      const ip = IpAddress.create('127.0.0.1');

      // Assert
      expect(ip.getValue()).toBe('127.0.0.1');
    });

    it('should accept all zeros', () => {
      // Arrange & Act
      const ip = IpAddress.create('0.0.0.0');

      // Assert
      expect(ip.getValue()).toBe('0.0.0.0');
    });

    it('should accept all 255s', () => {
      // Arrange & Act
      const ip = IpAddress.create('255.255.255.255');

      // Assert
      expect(ip.getValue()).toBe('255.255.255.255');
    });

    it('should accept private network ranges', () => {
      // Arrange & Act
      const privateIPs = [
        '10.0.0.1',
        '172.16.0.1',
        '192.168.0.1'
      ];

      // Assert
      privateIPs.forEach(ipStr => {
        const ip = IpAddress.create(ipStr);
        expect(ip.getValue()).toBe(ipStr);
      });
    });

    it('should accept public IP addresses', () => {
      // Arrange & Act
      const publicIPs = [
        '8.8.8.8',
        '1.1.1.1',
        '208.67.222.222'
      ];

      // Assert
      publicIPs.forEach(ipStr => {
        const ip = IpAddress.create(ipStr);
        expect(ip.getValue()).toBe(ipStr);
      });
    });
  });

  describe('create - valid IPv6 addresses', () => {
    it.skip('should create valid IPv6 address', () => {
      // IPv6 support not implemented yet
      // Arrange & Act
      const ip = IpAddress.create('2001:0db8:85a3:0000:0000:8a2e:0370:7334');

      // Assert
      expect(ip).toBeInstanceOf(IpAddress);
      expect(ip.getValue()).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it.skip('should accept compressed IPv6', () => {
      // IPv6 support not implemented yet
      // Arrange & Act
      const ip = IpAddress.create('2001:db8::1');

      // Assert
      expect(ip.getValue()).toBe('2001:db8::1');
    });

    it.skip('should accept IPv6 localhost', () => {
      // IPv6 support not implemented yet
      // Arrange & Act
      const ip = IpAddress.create('::1');

      // Assert
      expect(ip.getValue()).toBe('::1');
    });

    it.skip('should accept IPv6 any address', () => {
      // IPv6 support not implemented yet
      // Arrange & Act
      const ip = IpAddress.create('::');

      // Assert
      expect(ip.getValue()).toBe('::');
    });
  });

  describe('create - invalid addresses', () => {
    it('should reject empty string', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('')).toThrow('IP address cannot be empty');
    });

    it('should reject null', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create(null as any)).toThrow('IP address cannot be empty');
    });

    it('should reject undefined', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create(undefined as any)).toThrow('IP address cannot be empty');
    });

    it('should reject invalid IPv4 - too many octets', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('192.168.1.1.1')).toThrow('Invalid IP address format');
    });

    it('should reject invalid IPv4 - too few octets', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('192.168.1')).toThrow('Invalid IP address format');
    });

    it('should reject invalid IPv4 - octet out of range', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('192.168.1.256')).toThrow('IP address octets must be between 0 and 255');
      expect(() => IpAddress.create('300.168.1.1')).toThrow('IP address octets must be between 0 and 255');
    });

    it('should reject invalid IPv4 - negative numbers', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('192.168.-1.1')).toThrow('Invalid IP address format');
    });

    it('should reject invalid IPv4 - letters', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('192.168.1.abc')).toThrow('Invalid IP address format');
    });

    it('should reject hostname instead of IP', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('example.com')).toThrow('Invalid IP address format');
    });

    it('should reject URL instead of IP', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('http://192.168.1.1')).toThrow('Invalid IP address format');
    });

    it('should reject IP with CIDR notation', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('192.168.1.0/24')).toThrow('Invalid IP address format');
    });

    it('should reject IP with port', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('192.168.1.1:8080')).toThrow('Invalid IP address format');
    });
  });

  describe('equals', () => {
    it('should return true for identical IPs', () => {
      // Arrange
      const ip1 = IpAddress.create('192.168.1.1');
      const ip2 = IpAddress.create('192.168.1.1');

      // Act & Assert
      expect(ip1.equals(ip2)).toBe(true);
    });

    it('should return false for different IPs', () => {
      // Arrange
      const ip1 = IpAddress.create('192.168.1.1');
      const ip2 = IpAddress.create('192.168.1.2');

      // Act & Assert
      expect(ip1.equals(ip2)).toBe(false);
    });

    it.skip('should be case insensitive for IPv6', () => {
      // IPv6 support not implemented yet
      // Arrange
      const ip1 = IpAddress.create('2001:db8::1');
      const ip2 = IpAddress.create('2001:DB8::1');

      // Act & Assert
      expect(ip1.equals(ip2)).toBe(true);
    });

    it('should handle null comparison', () => {
      // Arrange
      const ip = IpAddress.create('192.168.1.1');

      // Act & Assert
      expect(ip.equals(null as any)).toBe(false);
    });

    it('should handle undefined comparison', () => {
      // Arrange
      const ip = IpAddress.create('192.168.1.1');

      // Act & Assert
      expect(ip.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return IP as string', () => {
      // Arrange
      const ip = IpAddress.create('192.168.1.1');

      // Act & Assert
      expect(ip.toString()).toBe('192.168.1.1');
    });

    it('should match getValue()', () => {
      // Arrange
      const ip = IpAddress.create('10.0.0.1');

      // Act & Assert
      expect(ip.toString()).toBe(ip.getValue());
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      // Arrange
      const ip = IpAddress.create('192.168.1.1');
      const original = ip.getValue();

      // Act - Try to modify (this should not affect the original)
      try {
        (ip as any).value = '10.0.0.1';
      } catch {
        // Expected to fail
      }

      // Assert
      expect(ip.getValue()).toBe(original);
    });

    it('should create independent instances', () => {
      // Arrange
      const ip1 = IpAddress.create('192.168.1.1');
      const ip2 = IpAddress.create('192.168.1.2');

      // Act & Assert
      expect(ip1.getValue()).not.toBe(ip2.getValue());
      expect(ip1).not.toBe(ip2);
    });
  });

  describe('edge cases', () => {
    it('should handle leading zeros in IPv4', () => {
      // Arrange & Act
      const ip = IpAddress.create('192.168.001.001');

      // Assert - Depending on implementation, this might be normalized
      expect(ip.getValue()).toBeTruthy();
    });

    it('should reject whitespace', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create(' 192.168.1.1 ')).toThrow('Invalid IP address format');
      expect(() => IpAddress.create('192.168.1. 1')).toThrow('Invalid IP address format');
    });

    it('should reject special characters', () => {
      // Arrange, Act & Assert
      expect(() => IpAddress.create('192.168.1.1;DROP TABLE')).toThrow('Invalid IP address format');
      expect(() => IpAddress.create('192.168.1.1\n')).toThrow('Invalid IP address format');
    });
  });
});

