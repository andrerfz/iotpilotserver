import {Port} from '../port.vo';

describe('Port Value Object', () => {
  it('should create a valid Port with a number', () => {
    const port = Port.create(8080);
    
    expect(port).toBeDefined();
    expect(port.toNumber()).toBe(8080);
    expect(port.toString()).toBe('8080');
  });

  it('should create a valid Port with a string', () => {
    const port = Port.create('8080');
    
    expect(port).toBeDefined();
    expect(port.toNumber()).toBe(8080);
    expect(port.toString()).toBe('8080');
  });

  it('should create a valid Port at the minimum boundary', () => {
    const port = Port.create(1);
    
    expect(port).toBeDefined();
    expect(port.toNumber()).toBe(1);
  });

  it('should create a valid Port at the maximum boundary', () => {
    const port = Port.create(65535);
    
    expect(port).toBeDefined();
    expect(port.toNumber()).toBe(65535);
  });

  it('should throw an error when creating with a non-numeric string', () => {
    expect(() => {
      Port.create('not-a-port');
    }).toThrow('Port number must be a valid number');
  });

  it('should throw an error when creating with a non-integer number', () => {
    expect(() => {
      Port.create(8080.5);
    }).toThrow('Port number must be an integer');
  });

  it('should throw an error when creating with a port below the minimum', () => {
    expect(() => {
      Port.create(0);
    }).toThrow('Port number must be between 1 and 65535');
  });

  it('should throw an error when creating with a port above the maximum', () => {
    expect(() => {
      Port.create(65536);
    }).toThrow('Port number must be between 1 and 65535');
  });

  it('should create a Port with the standard SSH port', () => {
    const port = Port.ssh();
    
    expect(port).toBeDefined();
    expect(port.toNumber()).toBe(22);
    expect(port.isSSH()).toBe(true);
  });

  it('should create a Port with the standard HTTP port', () => {
    const port = Port.http();
    
    expect(port).toBeDefined();
    expect(port.toNumber()).toBe(80);
    expect(port.isHTTP()).toBe(true);
  });

  it('should create a Port with the standard HTTPS port', () => {
    const port = Port.https();
    
    expect(port).toBeDefined();
    expect(port.toNumber()).toBe(443);
    expect(port.isHTTPS()).toBe(true);
  });

  it('should create a Port with the standard MQTT port', () => {
    const port = Port.mqtt();
    
    expect(port).toBeDefined();
    expect(port.toNumber()).toBe(1883);
    expect(port.isMQTT()).toBe(true);
  });

  it('should compare two Ports correctly', () => {
    const port1 = Port.create(8080);
    const port2 = Port.create(8080);
    const port3 = Port.create(9090);
    
    expect(port1.equals(port2)).toBe(true);
    expect(port1.equals(port3)).toBe(false);
  });

  it('should identify well-known ports correctly', () => {
    const wellKnown = Port.create(80);
    const registered = Port.create(8080);
    
    expect(wellKnown.isWellKnown()).toBe(true);
    expect(registered.isWellKnown()).toBe(false);
  });

  it('should identify registered ports correctly', () => {
    const wellKnown = Port.create(80);
    const registered = Port.create(8080);
    const dynamic = Port.create(50000);
    
    expect(wellKnown.isRegistered()).toBe(false);
    expect(registered.isRegistered()).toBe(true);
    expect(dynamic.isRegistered()).toBe(false);
  });

  it('should identify dynamic ports correctly', () => {
    const registered = Port.create(8080);
    const dynamic = Port.create(50000);
    
    expect(registered.isDynamic()).toBe(false);
    expect(dynamic.isDynamic()).toBe(true);
  });

  it('should identify SSH port correctly', () => {
    const ssh = Port.create(22);
    const other = Port.create(8080);
    
    expect(ssh.isSSH()).toBe(true);
    expect(other.isSSH()).toBe(false);
  });

  it('should identify HTTP port correctly', () => {
    const http = Port.create(80);
    const other = Port.create(8080);
    
    expect(http.isHTTP()).toBe(true);
    expect(other.isHTTP()).toBe(false);
  });

  it('should identify HTTPS port correctly', () => {
    const https = Port.create(443);
    const other = Port.create(8080);
    
    expect(https.isHTTPS()).toBe(true);
    expect(other.isHTTPS()).toBe(false);
  });

  it('should identify MQTT port correctly', () => {
    const mqtt = Port.create(1883);
    const other = Port.create(8080);
    
    expect(mqtt.isMQTT()).toBe(true);
    expect(other.isMQTT()).toBe(false);
  });

  it('should identify secure MQTT port correctly', () => {
    const mqttSecure = Port.create(8883);
    const other = Port.create(8080);
    
    expect(mqttSecure.isMQTTSecure()).toBe(true);
    expect(other.isMQTTSecure()).toBe(false);
  });
});