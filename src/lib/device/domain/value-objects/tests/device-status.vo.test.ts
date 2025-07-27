import {DeviceStatus} from '../device-status.vo';

describe('DeviceStatus Value Object', () => {
  it('should create a valid DeviceStatus', () => {
    const status = DeviceStatus.create('ONLINE');
    
    expect(status).toBeDefined();
    expect(status.toString()).toBe('ONLINE');
  });

  it('should create a valid DeviceStatus with lowercase input', () => {
    const status = DeviceStatus.create('online');
    
    expect(status).toBeDefined();
    expect(status.toString()).toBe('ONLINE');
  });

  it('should create a valid DeviceStatus with mixed case input', () => {
    const status = DeviceStatus.create('OnLine');
    
    expect(status).toBeDefined();
    expect(status.toString()).toBe('ONLINE');
  });

  it('should throw an error when creating with an empty status', () => {
    expect(() => {
      DeviceStatus.create('');
    }).toThrow('Device status cannot be empty');
  });

  it('should throw an error when creating with an invalid status', () => {
    expect(() => {
      DeviceStatus.create('INVALID_STATUS');
    }).toThrow('Invalid device status');
  });

  it('should create ONLINE status using static method', () => {
    const status = DeviceStatus.online();
    
    expect(status).toBeDefined();
    expect(status.toString()).toBe('ONLINE');
    expect(status.isOnline()).toBe(true);
  });

  it('should create OFFLINE status using static method', () => {
    const status = DeviceStatus.offline();
    
    expect(status).toBeDefined();
    expect(status.toString()).toBe('OFFLINE');
    expect(status.isOffline()).toBe(true);
  });

  it('should create MAINTENANCE status using static method', () => {
    const status = DeviceStatus.maintenance();
    
    expect(status).toBeDefined();
    expect(status.toString()).toBe('MAINTENANCE');
    expect(status.isInMaintenance()).toBe(true);
  });

  it('should create PROVISIONING status using static method', () => {
    const status = DeviceStatus.provisioning();
    
    expect(status).toBeDefined();
    expect(status.toString()).toBe('PROVISIONING');
    expect(status.isProvisioning()).toBe(true);
  });

  it('should create ERROR status using static method', () => {
    const status = DeviceStatus.error();
    
    expect(status).toBeDefined();
    expect(status.toString()).toBe('ERROR');
    expect(status.isError()).toBe(true);
  });

  it('should create UNKNOWN status using static method', () => {
    const status = DeviceStatus.unknown();
    
    expect(status).toBeDefined();
    expect(status.toString()).toBe('UNKNOWN');
    expect(status.isUnknown()).toBe(true);
  });

  it('should compare two DeviceStatuses correctly', () => {
    const status1 = DeviceStatus.create('ONLINE');
    const status2 = DeviceStatus.create('ONLINE');
    const status3 = DeviceStatus.create('OFFLINE');
    
    expect(status1.equals(status2)).toBe(true);
    expect(status1.equals(status3)).toBe(false);
  });

  it('should identify online status correctly', () => {
    const online = DeviceStatus.create('ONLINE');
    const offline = DeviceStatus.create('OFFLINE');
    
    expect(online.isOnline()).toBe(true);
    expect(offline.isOnline()).toBe(false);
  });

  it('should identify offline status correctly', () => {
    const online = DeviceStatus.create('ONLINE');
    const offline = DeviceStatus.create('OFFLINE');
    
    expect(online.isOffline()).toBe(false);
    expect(offline.isOffline()).toBe(true);
  });

  it('should identify maintenance status correctly', () => {
    const maintenance = DeviceStatus.create('MAINTENANCE');
    const online = DeviceStatus.create('ONLINE');
    
    expect(maintenance.isInMaintenance()).toBe(true);
    expect(online.isInMaintenance()).toBe(false);
  });

  it('should identify provisioning status correctly', () => {
    const provisioning = DeviceStatus.create('PROVISIONING');
    const online = DeviceStatus.create('ONLINE');
    
    expect(provisioning.isProvisioning()).toBe(true);
    expect(online.isProvisioning()).toBe(false);
  });

  it('should identify error status correctly', () => {
    const error = DeviceStatus.create('ERROR');
    const online = DeviceStatus.create('ONLINE');
    
    expect(error.isError()).toBe(true);
    expect(online.isError()).toBe(false);
  });

  it('should identify unknown status correctly', () => {
    const unknown = DeviceStatus.create('UNKNOWN');
    const online = DeviceStatus.create('ONLINE');
    
    expect(unknown.isUnknown()).toBe(true);
    expect(online.isUnknown()).toBe(false);
  });

  it('should identify available status correctly', () => {
    const available = DeviceStatus.create('ONLINE');
    const unavailable = [
      DeviceStatus.create('OFFLINE'),
      DeviceStatus.create('MAINTENANCE'),
      DeviceStatus.create('ERROR'),
      DeviceStatus.create('UNKNOWN')
    ];
    
    expect(available.isAvailable()).toBe(true);
    
    unavailable.forEach(status => {
      expect(status.isAvailable()).toBe(false);
    });
  });

  it('should identify unavailable status correctly', () => {
    const available = DeviceStatus.create('ONLINE');
    const unavailable = [
      DeviceStatus.create('OFFLINE'),
      DeviceStatus.create('MAINTENANCE'),
      DeviceStatus.create('ERROR'),
      DeviceStatus.create('UNKNOWN')
    ];
    
    expect(available.isUnavailable()).toBe(false);
    
    unavailable.forEach(status => {
      expect(status.isUnavailable()).toBe(true);
    });
  });

  it('should return all valid device statuses', () => {
    const allStatuses = DeviceStatus.getAllStatuses();
    
    expect(allStatuses).toContain('ONLINE');
    expect(allStatuses).toContain('OFFLINE');
    expect(allStatuses).toContain('MAINTENANCE');
    expect(allStatuses).toContain('PROVISIONING');
    expect(allStatuses).toContain('ERROR');
    expect(allStatuses).toContain('UNKNOWN');
    expect(allStatuses.length).toBe(6); // Ensure no extra statuses
  });
});