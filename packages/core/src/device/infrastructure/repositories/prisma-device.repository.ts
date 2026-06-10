import {TenantContext} from '../../../shared/domain/tenant-context';
import {PrismaService} from '../../../shared/infrastructure/database/prisma.service';
import {DeviceEntity} from '../../domain/entities/device.entity';
import {DeviceRepository, DeviceSearchOptions, DeviceSearchResult} from '../../domain/interfaces/device.repository';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {DeviceMapper} from '../mappers/device.mapper';
import {MetricsRepository} from '../../domain/interfaces/metrics-repository.interface';
import {getSecretCipher} from '../../../shared/infrastructure/crypto/secret-cipher.factory';

export class PrismaDeviceRepository implements DeviceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsRepository?: MetricsRepository
  ) {}

  async findById(id: DeviceId, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const where: any = {
      id: id.value,
      deletedAt: null
    };

    // Apply tenant filtering
    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    const device = await this.prisma.getClient().device.findFirst({
      where,
      include: {
        metrics: true
      }
    });

    if (!device) {
      return null;
    }

    return DeviceMapper.toDomain(device, tenantContext);
  }

  async findByDeviceId(deviceId: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const where: any = {
      id: deviceId,
      deletedAt: null
    };

    // Apply tenant filtering
    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    const device = await this.prisma.getClient().device.findFirst({
      where,
      include: {
        metrics: true
      }
    });

    if (!device) {
      return null;
    }

    return DeviceMapper.toDomain(device, tenantContext);
  }

  async findByName(name: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const where: any = {
      name: name,
      deletedAt: null
    };

    // Apply tenant filtering
    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    const device = await this.prisma.getClient().device.findFirst({
      where,
      include: {
        metrics: true
      }
    });

    if (!device) {
      return null;
    }

    return DeviceMapper.toDomain(device, tenantContext);
  }

  async save(device: DeviceEntity, tenantContext?: TenantContext): Promise<void> {
    const persistenceData = DeviceMapper.toPersistence(device) as any;
    
    if (tenantContext && !tenantContext.isSuperAdmin()) {
      // Validate tenant access
      const customerId = tenantContext.getCustomerId();
      if (customerId) {
        device.validateBelongsToTenant(customerId);
        persistenceData.customerId = customerId.getValue();
      }
    }

    // Store SSH credentials in capabilities JSON field if present.
    // Secret material (privateKey, passphrase) is encrypted at rest with the
    // process SecretCipher; only non-sensitive metadata is stored in clear.
    const updateData: any = { ...persistenceData };
    if (device.sshCredentials) {
      const creds = device.sshCredentials;
      const existingCapabilities = (updateData.capabilities as any) || {};
      const cipher = getSecretCipher();

      // Skip empties and the legacy read-path placeholder; never double-encrypt.
      const encryptIfPresent = (value?: string): string | undefined => {
        if (!value || value === 'password-based-auth') return undefined;
        return cipher.isEncrypted(value) ? value : cipher.encrypt(value);
      };

      const secret: Record<string, string> = {};
      const encryptedKey = encryptIfPresent(creds.privateKey);
      const encryptedPassphrase = encryptIfPresent(creds.passphrase);
      if (encryptedKey) secret.privateKey = encryptedKey;
      if (encryptedPassphrase) secret.passphrase = encryptedPassphrase;

      updateData.capabilities = {
        ...existingCapabilities,
        ssh: {
          username: creds.username,
          port: creds.port || 22,
          authMethod: creds.privateKey ? 'key' : 'password',
          ...(Object.keys(secret).length > 0 ? { secret } : {}),
        }
      };
    }

    // Get device ID from persistence data (it uses 'id' field)
    const deviceId = updateData.id || device.getId().getValue();
    
    // Clean up the data for Prisma - remove undefined values
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    }
    
    await this.prisma.getClient().device.upsert({
      where: { id: deviceId },
      update: {
        ...cleanedData,
        updatedAt: new Date()
      },
      create: cleanedData
    });

    // Save metrics to DeviceMetric table for Grafana time-series data
    if (device.metrics && this.metricsRepository && tenantContext) {
      const timestamp = device.metrics.timestamp || new Date();
      const metricsData = [
        {
          deviceId: deviceId,
          metric: 'cpu_usage',
          value: device.metrics.cpuUsage,
          unit: '%',
          timestamp: timestamp
        },
        {
          deviceId: deviceId,
          metric: 'memory_usage',
          value: device.metrics.memoryUsage,
          unit: '%',
          timestamp: timestamp
        },
        {
          deviceId: deviceId,
          metric: 'disk_usage',
          value: device.metrics.diskUsage,
          unit: '%',
          timestamp: timestamp
        },
        {
          deviceId: deviceId,
          metric: 'uptime',
          value: device.metrics.uptime,
          unit: 'seconds',
          timestamp: timestamp
        }
      ];

      try {
        await this.metricsRepository.saveMany(metricsData, tenantContext);
      } catch (error) {
        // Log error but don't fail device save operation
        console.error(`Failed to save metrics for device ${deviceId}:`, error);
      }
    }
  }

  async saveAll(devices: DeviceEntity[], tenantContext?: TenantContext): Promise<void> {
    const operations = devices.map(async (device) => {
      await this.save(device, tenantContext);
    });

    await Promise.all(operations);
  }

  async saveMany(devices: DeviceEntity[], tenantContext?: TenantContext): Promise<void> {
    // Alias for saveAll to maintain interface compatibility
    return this.saveAll(devices, tenantContext);
  }

  async findAll(tenantContext?: TenantContext): Promise<DeviceEntity[]> {
    const where: any = {
      deletedAt: null
    };

    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    const devices = await this.prisma.getClient().device.findMany({
      where,
      include: {
        metrics: true
      },
      orderBy: { registeredAt: 'desc' }
    });

    return devices.map((device: any) => DeviceMapper.toDomain(device, tenantContext)).filter((d: DeviceEntity | null): d is DeviceEntity => d !== null);
  }

  async findAllWithPagination(
    options?: DeviceSearchOptions,
    tenantContext?: TenantContext
  ): Promise<DeviceEntity[]> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null
    };

    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    // Apply search filters
    if (options?.searchTerm) {
      where.OR = [
        { name: { contains: options.searchTerm, mode: 'insensitive' } },
        { hostname: { contains: options.searchTerm, mode: 'insensitive' } }
      ];
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.ipAddress) {
      where.ipAddress = { contains: options.ipAddress };
    }

    const devices = await this.prisma.getClient().device.findMany({
      where,
      skip,
      take: limit,
      include: {
        metrics: true
      },
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'desc' } : { registeredAt: 'desc' }
    });

    return devices.map((device: any) => DeviceMapper.toDomain(device, tenantContext)).filter((d: DeviceEntity | null): d is DeviceEntity => d !== null);
  }

  async search(
    criteria: any,
    options?: DeviceSearchOptions,
    tenantContext?: TenantContext
  ): Promise<DeviceSearchResult> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    // Ensure tenant filtering
    if (tenantContext && !tenantContext.isSuperAdmin()) {
      criteria.customerId = tenantContext.getCustomerId()?.value;
    }

    // Default criteria
    const where: any = {
      ...criteria,
      deletedAt: null
    };

    // Get total count
    const total = await this.prisma.getClient().device.count({ where });

    // Get paginated results
    const devices = await this.prisma.getClient().device.findMany({
      where,
      skip,
      take: limit,
      include: {
        metrics: true
      },
      orderBy: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'desc' } : { registeredAt: 'desc' }
    });

    const deviceEntities = devices.map((device: any) => DeviceMapper.toDomain(device, tenantContext)).filter((d: DeviceEntity | null): d is DeviceEntity => d !== null);

    return {
      devices: deviceEntities,
      total,
      limit,
      offset: skip
    };
  }

  async findByIpAddress(ipAddress: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const where: any = {
      ipAddress: { contains: ipAddress },
      deletedAt: null
    };

    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    const device = await this.prisma.getClient().device.findFirst({
      where,
      include: {
        metrics: true
      }
    });

    return DeviceMapper.toDomain(device, tenantContext);
  }

  async findOnlineDevices(tenantContext?: TenantContext): Promise<DeviceEntity[]> {
    const where: any = {
      deletedAt: null,
      lastSeen: { gte: new Date(Date.now() - 120000) }, // 2 minutes ago
      status: 'ONLINE'
    };

    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    const devices = await this.prisma.getClient().device.findMany({
      where,
      include: {
        metrics: true
      },
      orderBy: { lastSeen: 'desc' }
    });

    return devices.map((device: any) => DeviceMapper.toDomain(device, tenantContext)).filter((d: DeviceEntity | null): d is DeviceEntity => d !== null);
  }

  async count(tenantContext?: TenantContext): Promise<number> {
    const where: any = { deletedAt: null };

    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    return this.prisma.getClient().device.count({ where });
  }

  async countOnlineDevices(tenantContext?: TenantContext): Promise<number> {
    const where: any = {
      deletedAt: null,
      lastSeen: { gte: new Date(Date.now() - 120000) }, // 2 minutes ago
      status: 'ONLINE'
    };

    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    return this.prisma.getClient().device.count({ where });
  }

  async softDelete(deviceId: DeviceId, tenantContext?: TenantContext): Promise<void> {
    const where: any = { id: deviceId.value };

    if (tenantContext && !tenantContext.isSuperAdmin()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    await this.prisma.getClient().device.updateMany({
      where,
      data: {
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  // SSH credentials are now stored in the capabilities JSON field
  // This method is kept for backward compatibility but is no longer used
  // private async saveSshCredentials(deviceId: string, credentials: SSHCredentials): Promise<void> {
  //   // SSH credentials are stored in Device.capabilities JSON field
  //   // This method is deprecated
  // }

  // DeviceEntity.metrics is of type DeviceMetrics (interface), not DeviceMetrics (entity)
  // Metrics should be persisted separately via MetricsRepository as time-series data
  // The DeviceEntity.metrics property is for in-memory use only and is not persisted here
}