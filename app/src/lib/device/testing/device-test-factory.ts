import {DeviceEntity, DeviceMetrics, SSHCredentials} from '../domain/entities/device.entity';
import {DeviceId} from '../domain/value-objects/device-id.vo';
import {DeviceName} from '../domain/value-objects/device-name.vo';
import {DeviceStatus} from '../domain/value-objects/device-status.vo';
import {CustomerId} from '../../shared/domain/value-objects/customer-id.vo';
import {IpAddress} from '../domain/value-objects/ip-address.vo';

export class DeviceTestFactory {
  /**
   * Creates a basic test device with minimal required properties
   */
  static createDevice(
    id: string = `test-device-${Date.now()}`,
    name: string = 'Test Device',
    customerId: string = 'test-customer-1',
    status: DeviceStatus = DeviceStatus.offlineInactive()
  ): DeviceEntity {
    const deviceId = DeviceId.fromString(id);
    const deviceName = DeviceName.fromString(name);
    const customerIdVO = CustomerId.fromString(customerId);
    
    return DeviceEntity.create(
      deviceId,
      deviceName,
      customerIdVO,
      status
    );
  }

  /**
   * Creates a Raspberry Pi specific test device
   */
  static createRaspberryPi(
    id: string = `raspberry-pi-${Date.now()}`,
    name: string = 'Raspberry Pi Test',
    customerId: string = 'test-customer-1'
  ): DeviceEntity {
    const device = this.createDevice(id, name, customerId, DeviceStatus.onlineAndActive());
    
    // Add Raspberry Pi specific properties
    const ip = IpAddress.fromString('192.168.1.100');
    device.updateNetwork(ip.value, undefined, 'raspberry-pi.local');
    
    // Set capabilities
    device.capabilities = ['temperature', 'humidity', 'camera', 'gpio'];
    device.firmwareVersion = 'Raspberry Pi OS 11.2';
    device.osVersion = '5.15.32-v7+';
    
    // Add SSH credentials
    device.sshCredentials = {
      username: 'pi',
      port: 22,
      privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----',
      passphrase: 'raspberry'
    };
    
    // Set recent heartbeat
    device.lastHeartbeat = Date.now();
    
    return device;
  }

  /**
   * Creates multiple test devices for bulk operations
   */
  static createMultipleDevices(
    count: number = 5,
    customerId: string = 'test-customer-1',
    onlineRatio: number = 0.6 // 60% online by default
  ): DeviceEntity[] {
    const devices: DeviceEntity[] = [];
    
    for (let i = 1; i <= count; i++) {
      const isOnline = Math.random() < onlineRatio;
      const deviceId = `device-${customerId}-${i.toString().padStart(3, '0')}`;
      const deviceName = `Test Device ${i}`;
      
      const device = this.createDevice(deviceId, deviceName, customerId);
      
      if (isOnline) {
        // Online device with IP and recent heartbeat
        const ip = IpAddress.fromString(`192.168.1.${100 + i}`);
        device.updateNetwork(ip.value, undefined, `device-${i}.local`);
        
        device.status = DeviceStatus.onlineAndActive();
        device.lastHeartbeat = Date.now() - (Math.random() * 60000); // Within last minute
        device.metrics = {
          cpuUsage: Math.random() * 80,
          memoryUsage: Math.random() * 70,
          diskUsage: Math.random() * 90,
          uptime: Math.floor(Math.random() * 1000000),
          timestamp: new Date()
        };
      } else {
        // Offline device
        device.status = DeviceStatus.offlineInactive();
        device.lastHeartbeat = Date.now() - (Math.random() * 3000000); // 30-50 minutes ago
      }
      
      devices.push(device);
    }
    
    return devices;
  }

  /**
   * Creates an unknown device (no type/capabilities identified)
   */
  static createUnknownDevice(
    id: string = `unknown-device-${Date.now()}`,
    name: string = 'Unknown Device',
    customerId: string = 'test-customer-1'
  ): DeviceEntity {
    const device = this.createDevice(id, name, customerId, DeviceStatus.offlineInactive());
    
    // Unknown device properties
    device.hostname = 'unknown.local';
    device.capabilities = [];
    device.firmwareVersion = 'unknown';
    device.osVersion = 'unknown';
    device.lastHeartbeat = 0; // Never seen
    
    return device;
  }

  /**
   * Creates a fully featured online device for comprehensive testing
   */
  static createFullDevice(
    id: string = `full-device-${Date.now()}`,
    name: string = 'Full Featured Device',
    customerId: string = 'test-customer-1'
  ): DeviceEntity {
    const device = this.createDevice(id, name, customerId, DeviceStatus.onlineAndActive());
    
    // Network configuration
    const ip = IpAddress.fromString('10.0.0.50');
    const tailscale = IpAddress.fromString('100.64.0.1');
    device.updateNetwork(ip.value, tailscale.value, 'full-device.local');
    
    // Comprehensive SSH credentials
    device.sshCredentials = {
      username: 'ubuntu',
      port: 22,
      privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQE...full-private-key...\n-----END RSA PRIVATE KEY-----',
      passphrase: 'secure-passphrase-123'
    };
    
    // Device capabilities
    device.capabilities = [
      'temperature', 'humidity', 'pressure', 'motion', 
      'light', 'sound', 'gps', 'wifi', 'bluetooth'
    ];
    
    // Software versions
    device.firmwareVersion = '2.3.1';
    device.osVersion = 'Ubuntu 22.04 LTS';
    
    // Recent activity
    device.lastHeartbeat = Date.now() - 30000; // 30 seconds ago
    device.status = DeviceStatus.onlineAndActive();
    
    // Comprehensive metrics
    device.metrics = {
      cpuUsage: 23.5,
      memoryUsage: 45.8,
      diskUsage: 67.2,
      uptime: 1234567,
      timestamp: new Date(Date.now() - 30000)
    };
    
    return device;
  }

  /**
   * Creates an offline device that was previously online
   */
  static createOfflineDevice(
    id: string = `offline-device-${Date.now()}`,
    name: string = 'Offline Device',
    customerId: string = 'test-customer-1'
  ): DeviceEntity {
    const device = this.createDevice(id, name, customerId, DeviceStatus.offlineInactive());
    
    // Previously had network configuration
    const ip = IpAddress.fromString('192.168.1.200');
    device.updateNetwork(ip.value, undefined, 'offline-device.local');
    
    // Last seen 45 minutes ago
    device.lastHeartbeat = Date.now() - (45 * 60 * 1000);
    
    return device;
  }

  /**
   * Creates a device in maintenance mode
   */
  static createMaintenanceDevice(
    id: string = `maintenance-device-${Date.now()}`,
    name: string = 'Maintenance Device',
    customerId: string = 'test-customer-1'
  ): DeviceEntity {
    const device = this.createDevice(id, name, customerId, DeviceStatus.onlineMaintenance());
    
    const ip = IpAddress.fromString('192.168.1.150');
    device.updateNetwork(ip.value, undefined, 'maintenance.local');
    
    device.lastHeartbeat = Date.now() - 60000; // 1 minute ago
    device.capabilities = ['temperature', 'humidity'];
    
    return device;
  }

  /**
   * Creates a retired device
   */
  static createRetiredDevice(
    id: string = `retired-device-${Date.now()}`,
    name: string = 'Retired Device',
    customerId: string = 'test-customer-1'
  ): DeviceEntity {
    const device = this.createDevice(id, name, customerId, DeviceStatus.retired());
    
    device.lastHeartbeat = 0; // Never active
    device.capabilities = [];
    
    return device;
  }

  /**
   * Creates a device with SSH connection issues
   */
  static createSshProblemDevice(
    id: string = `ssh-problem-device-${Date.now()}`,
    name: string = 'SSH Problem Device',
    customerId: string = 'test-customer-1'
  ): DeviceEntity {
    const device = this.createDevice(id, name, customerId, DeviceStatus.offlineButActive());
    
    const ip = IpAddress.fromString('192.168.1.999'); // Invalid IP range
    device.updateNetwork(ip.value, undefined, 'ssh-problem.local');
    
    // Incomplete SSH credentials
    device.sshCredentials = {
      username: 'root',
      port: 22,
      privateKey: 'invalid-key-format'
      // Missing passphrase for encrypted key
    };
    
    device.lastHeartbeat = Date.now() - 1800000; // 30 minutes ago
    
    return device;
  }

  /**
   * Creates a soft-deleted device for testing deletion logic
   */
  static createSoftDeletedDevice(
    id: string = `deleted-device-${Date.now()}`,
    name: string = 'Soft Deleted Device',
    customerId: string = 'test-customer-1'
  ): DeviceEntity {
    const device = this.createDevice(id, name, customerId, DeviceStatus.offlineInactive());
    
    // Perform soft delete
    device.softDelete();
    
    return device;
  }

  /**
   * Creates a device with high resource usage for alert testing
   */
  static createHighUsageDevice(
    id: string = `high-usage-device-${Date.now()}`,
    name: string = 'High Usage Device',
    customerId: string = 'test-customer-1'
  ): DeviceEntity {
    const device = this.createDevice(id, name, customerId, DeviceStatus.onlineAndActive());
    
    const ip = IpAddress.fromString('192.168.1.250');
    device.updateNetwork(ip.value, undefined, 'high-usage.local');
    
    device.lastHeartbeat = Date.now();
    
    // High resource usage metrics
    device.metrics = {
      cpuUsage: 95.2,  // Very high CPU
      memoryUsage: 92.8, // Very high memory
      diskUsage: 98.5,  // Almost full disk
      uptime: 864000,   // 10 days uptime
      timestamp: new Date()
    };
    
    return device;
  }

  /**
   * Utility method to create a simple SSH credentials object
   */
  static createSshCredentials(
    username: string = 'pi',
    port: number = 22,
    privateKey: string = '-----BEGIN RSA PRIVATE KEY-----\ntest-private-key\n-----END RSA PRIVATE KEY-----',
    passphrase?: string
  ): SSHCredentials {
    return {
      username,
      port,
      privateKey,
      passphrase
    };
  }

  /**
   * Utility method to create sample metrics
   */
  static createMetrics(
    cpuUsage: number = Math.random() * 100,
    memoryUsage: number = Math.random() * 100,
    diskUsage: number = Math.random() * 100,
    uptime: number = Math.floor(Math.random() * 1000000)
  ): DeviceMetrics {
    return {
      cpuUsage,
      memoryUsage,
      diskUsage,
      uptime,
      timestamp: new Date()
    };
  }
}
