import {DeviceType} from '../device-type.vo';

describe('DeviceType Value Object', () => {
  it('should create a valid DeviceType', () => {
    const type = DeviceType.create('RASPBERRY_PI');
    
    expect(type).toBeDefined();
    expect(type.toString()).toBe('RASPBERRY_PI');
  });

  it('should create a valid DeviceType with lowercase input', () => {
    const type = DeviceType.create('raspberry_pi');
    
    expect(type).toBeDefined();
    expect(type.toString()).toBe('RASPBERRY_PI');
  });

  it('should create a valid DeviceType with mixed case input', () => {
    const type = DeviceType.create('Raspberry_Pi');
    
    expect(type).toBeDefined();
    expect(type.toString()).toBe('RASPBERRY_PI');
  });

  it('should throw an error when creating with an empty type', () => {
    expect(() => {
      DeviceType.create('');
    }).toThrow('Device type cannot be empty');
  });

  it('should throw an error when creating with an invalid type', () => {
    expect(() => {
      DeviceType.create('INVALID_TYPE');
    }).toThrow('Invalid device type');
  });

  it('should compare two DeviceTypes correctly', () => {
    const type1 = DeviceType.create('RASPBERRY_PI');
    const type2 = DeviceType.create('RASPBERRY_PI');
    const type3 = DeviceType.create('ESP32');
    
    expect(type1.equals(type2)).toBe(true);
    expect(type1.equals(type3)).toBe(false);
  });

  it('should identify Raspberry Pi devices correctly', () => {
    const raspberryPi = DeviceType.create('RASPBERRY_PI');
    const other = DeviceType.create('ESP32');
    
    expect(raspberryPi.isRaspberryPi()).toBe(true);
    expect(other.isRaspberryPi()).toBe(false);
  });

  it('should identify Arduino devices correctly', () => {
    const arduino = DeviceType.create('ARDUINO');
    const other = DeviceType.create('ESP32');
    
    expect(arduino.isArduino()).toBe(true);
    expect(other.isArduino()).toBe(false);
  });

  it('should identify ESP32 devices correctly', () => {
    const esp32 = DeviceType.create('ESP32');
    const other = DeviceType.create('RASPBERRY_PI');
    
    expect(esp32.isESP32()).toBe(true);
    expect(other.isESP32()).toBe(false);
  });

  it('should identify ESP8266 devices correctly', () => {
    const esp8266 = DeviceType.create('ESP8266');
    const other = DeviceType.create('RASPBERRY_PI');
    
    expect(esp8266.isESP8266()).toBe(true);
    expect(other.isESP8266()).toBe(false);
  });

  it('should identify Jetson Nano devices correctly', () => {
    const jetsonNano = DeviceType.create('JETSON_NANO');
    const other = DeviceType.create('RASPBERRY_PI');
    
    expect(jetsonNano.isJetsonNano()).toBe(true);
    expect(other.isJetsonNano()).toBe(false);
  });

  it('should identify BeagleBone devices correctly', () => {
    const beagleBone = DeviceType.create('BEAGLEBONE');
    const other = DeviceType.create('RASPBERRY_PI');
    
    expect(beagleBone.isBeagleBone()).toBe(true);
    expect(other.isBeagleBone()).toBe(false);
  });

  it('should identify Rock Pi devices correctly', () => {
    const rockPi = DeviceType.create('ROCK_PI');
    const other = DeviceType.create('RASPBERRY_PI');
    
    expect(rockPi.isRockPi()).toBe(true);
    expect(other.isRockPi()).toBe(false);
  });

  it('should identify Orange Pi devices correctly', () => {
    const orangePi = DeviceType.create('ORANGE_PI');
    const other = DeviceType.create('RASPBERRY_PI');
    
    expect(orangePi.isOrangePi()).toBe(true);
    expect(other.isOrangePi()).toBe(false);
  });

  it('should identify custom Linux devices correctly', () => {
    const customLinux = DeviceType.create('CUSTOM_LINUX');
    const other = DeviceType.create('RASPBERRY_PI');
    
    expect(customLinux.isCustomLinux()).toBe(true);
    expect(other.isCustomLinux()).toBe(false);
  });

  it('should identify "Other" devices correctly', () => {
    const otherDevice = DeviceType.create('OTHER');
    const specificDevice = DeviceType.create('RASPBERRY_PI');
    
    expect(otherDevice.isOther()).toBe(true);
    expect(specificDevice.isOther()).toBe(false);
  });

  it('should identify SSH-supporting devices correctly', () => {
    const sshSupported = [
      DeviceType.create('RASPBERRY_PI'),
      DeviceType.create('JETSON_NANO'),
      DeviceType.create('BEAGLEBONE'),
      DeviceType.create('ROCK_PI'),
      DeviceType.create('ORANGE_PI'),
      DeviceType.create('CUSTOM_LINUX')
    ];
    
    const sshNotSupported = [
      DeviceType.create('ARDUINO'),
      DeviceType.create('ESP32'),
      DeviceType.create('ESP8266'),
      DeviceType.create('OTHER')
    ];
    
    sshSupported.forEach(type => {
      expect(type.supportsSSH()).toBe(true);
    });
    
    sshNotSupported.forEach(type => {
      expect(type.supportsSSH()).toBe(false);
    });
  });

  it('should return all valid device types', () => {
    const allTypes = DeviceType.getAllTypes();
    
    expect(allTypes).toContain('RASPBERRY_PI');
    expect(allTypes).toContain('ARDUINO');
    expect(allTypes).toContain('ESP32');
    expect(allTypes).toContain('ESP8266');
    expect(allTypes).toContain('JETSON_NANO');
    expect(allTypes).toContain('BEAGLEBONE');
    expect(allTypes).toContain('ROCK_PI');
    expect(allTypes).toContain('ORANGE_PI');
    expect(allTypes).toContain('CUSTOM_LINUX');
    expect(allTypes).toContain('OTHER');
    expect(allTypes.length).toBe(10); // Ensure no extra types
  });
});