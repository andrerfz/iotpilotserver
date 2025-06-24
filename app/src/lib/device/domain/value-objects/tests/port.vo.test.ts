import { describe, it, expect } from 'vitest';
import { Port } from '../port.vo';

describe('Port Value Object', () => {
  it('should create a Port with valid values', () => {
    // Test boundary values and a middle value
    const validPorts = [1, 80, 443, 8080, 65535];
    
    validPorts.forEach(port => {
      const portObj = Port.create(port);
      expect(portObj.getValue).toBe(port);
    });
  });

  it('should throw an error when created with an invalid value', () => {
    // Test values outside the valid range
    expect(() => Port.create(0)).toThrow('Invalid port number: 0');
    expect(() => Port.create(65536)).toThrow('Invalid port number: 65536');
    expect(() => Port.create(-1)).toThrow('Invalid port number: -1');
    
    // Test non-integer values
    expect(() => Port.create(80.5)).toThrow('Invalid port number: 80.5');
    expect(() => Port.create(NaN)).toThrow('Invalid port number: NaN');
  });

  it('should validate port numbers correctly', () => {
    // Valid ports
    expect(Port.isValid(1)).toBe(true);
    expect(Port.isValid(80)).toBe(true);
    expect(Port.isValid(443)).toBe(true);
    expect(Port.isValid(8080)).toBe(true);
    expect(Port.isValid(65535)).toBe(true);
    
    // Invalid ports
    expect(Port.isValid(0)).toBe(false);
    expect(Port.isValid(65536)).toBe(false);
    expect(Port.isValid(-1)).toBe(false);
    expect(Port.isValid(80.5)).toBe(false);
    expect(Port.isValid(NaN)).toBe(false);
  });

  it('should correctly compare two Ports for equality', () => {
    const port1 = Port.create(80);
    const port2 = Port.create(80);
    const port3 = Port.create(443);
    
    expect(port1.equals(port2)).toBe(true);
    expect(port1.equals(port3)).toBe(false);
    expect(port2.equals(port3)).toBe(false);
  });

  it('should convert to string correctly', () => {
    const port = Port.create(8080);
    expect(port.toString()).toBe('8080');
  });
});