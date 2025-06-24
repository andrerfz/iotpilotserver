import { createClient, RedisClientType } from 'redis';
import { Device } from '@/lib/device/domain/entities/device.entity';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
import { DeviceRepository } from '@/lib/device/domain/interfaces/device-repository.interface';
import { DeviceMapper, DevicePersistence } from '@/lib/device/infrastructure/mappers/device.mapper';

export class RedisDeviceCacheRepository implements DeviceRepository {
  private readonly keyPrefix = 'device:';
  private readonly ttl = 3600; // 1 hour in seconds

  constructor(private readonly redis: RedisClientType) {}

  private getKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  async findById(id: DeviceId): Promise<Device | null> {
    const deviceJson = await this.redis.get(this.getKey(id.value));
    if (!deviceJson) {
      return null;
    }

    try {
      const deviceData = JSON.parse(deviceJson) as DevicePersistence;
      return DeviceMapper.toDomain(deviceData);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
      console.error(`Error parsing device data from Redis: ${errorMessage}`);
      return null;
    }
  }

  async findByName(name: string): Promise<Device | null> {
    // Redis doesn't support direct querying by fields other than key
    // We need to scan all keys and check each device
    const keys = await this.redis.keys(`${this.keyPrefix}*`);

    for (const key of keys) {
      const deviceJson = await this.redis.get(key);
      if (deviceJson) {
        try {
          const deviceData = JSON.parse(deviceJson) as DevicePersistence;
          if (deviceData.name === name) {
            return DeviceMapper.toDomain(deviceData);
          }
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Unknown error occurred';
          console.error(`Error parsing device data from Redis: ${errorMessage}`);
        }
      }
    }

    return null;
  }

  async findByIpAddress(ipAddress: string): Promise<Device | null> {
    // Redis doesn't support direct querying by fields other than key
    // We need to scan all keys and check each device
    const keys = await this.redis.keys(`${this.keyPrefix}*`);

    for (const key of keys) {
      const deviceJson = await this.redis.get(key);
      if (deviceJson) {
        try {
          const deviceData = JSON.parse(deviceJson) as DevicePersistence;
          if (deviceData.ipAddress === ipAddress) {
            return DeviceMapper.toDomain(deviceData);
          }
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Unknown error occurred';
          console.error(`Error parsing device data from Redis: ${errorMessage}`);
        }
      }
    }

    return null;
  }

  async findAll(): Promise<Device[]> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    const devices: Device[] = [];

    for (const key of keys) {
      const deviceJson = await this.redis.get(key);
      if (deviceJson) {
        try {
          const deviceData = JSON.parse(deviceJson) as DevicePersistence;
          devices.push(DeviceMapper.toDomain(deviceData));
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Unknown error occurred';
          console.error(`Error parsing device data from Redis: ${errorMessage}`);
        }
      }
    }

    return devices;
  }

  async findActive(): Promise<Device[]> {
    const devices = await this.findAll();
    return devices.filter(device => device.status.value === 'active');
  }

  async findInactive(): Promise<Device[]> {
    const devices = await this.findAll();
    return devices.filter(device => device.status.value === 'inactive');
  }

  async save(device: Device): Promise<void> {
    const deviceData = DeviceMapper.toPersistence(device);
    await this.redis.set(
      this.getKey(device.id.value),
      JSON.stringify(deviceData),
      {
        EX: this.ttl
      }
    );
  }

  async delete(id: DeviceId): Promise<void> {
    await this.redis.del(this.getKey(id.value));
  }

  // Cache-specific methods
  async invalidateCache(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  async refreshTTL(id: DeviceId): Promise<void> {
    await this.redis.expire(this.getKey(id.value), this.ttl);
  }
}
