import {DeviceEntity, SSHCredentials} from '../../domain/entities/device.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {DeviceName} from '../../domain/value-objects/device-name.vo';
import {DeviceStatus} from '../../domain/value-objects/device-status.vo';
import {CustomerId} from '../../../shared/domain/value-objects/customer-id.vo';
import {IpAddress} from '../../../shared/domain/value-objects/ip-address.vo';
import {
    CreateDeviceDTO,
    DeviceDetailDto,
    DeviceDetailsDTO,
    DeviceDto,
    DeviceListItemDTO,
    DeviceSummaryDto,
    UpdateDeviceDTO
} from '../dto/device.dto';
import {TenantContext} from '../../../shared/domain/tenant-context';
import {getSecretCipher} from '../../../shared/infrastructure/crypto/secret-cipher.factory';

export class DeviceMapper {
  static toDomain(persistence: any, tenantContext?: TenantContext): DeviceEntity | null {
    if (!persistence) {
      return null;
    }

    const id = DeviceId.fromString(persistence.id);
    const customerId = persistence.customerId ? CustomerId.fromString(persistence.customerId) : null;
    const name = DeviceName.fromString(persistence.name || persistence.hostname || persistence.deviceId || persistence.id);
    
    // Handle status mapping
    let status: DeviceStatus;
    if (persistence.status) {
      status = DeviceStatus.createFromLegacyStatus(persistence.status);
    } else {
      status = DeviceStatus.offlineInactive();
    }

    // Handle IP addresses with null safety
    let ipAddress: IpAddress | undefined;
    if (persistence.ipAddress) {
      try {
        ipAddress = IpAddress.fromString(persistence.ipAddress);
      } catch (error) {
        // Log invalid IP but continue
        console.warn(`Invalid IP address for device ${persistence.id}: ${persistence.ipAddress}`);
      }
    }

    let tailscaleIp: IpAddress | undefined;
    if (persistence.tailscaleIp) {
      try {
        tailscaleIp = IpAddress.fromString(persistence.tailscaleIp);
      } catch (error) {
        console.warn(`Invalid Tailscale IP for device ${persistence.id}: ${persistence.tailscaleIp}`);
      }
    }

    // Extract SSH credentials from capabilities if present. Secret material is
    // stored encrypted (capabilities.ssh.secret) and decrypted here. The cipher
    // is only invoked when an encrypted secret exists, so device reads keep
    // working in environments without CREDENTIAL_ENCRYPTION_KEY set.
    let sshCredentials: any = undefined;
    if (persistence.capabilities && typeof persistence.capabilities === 'object') {
      const caps = persistence.capabilities as any;
      if (caps.ssh) {
        let privateKey = 'password-based-auth'; // legacy / no-secret fallback
        let passphrase: string | undefined = undefined;

        let password: string | undefined = undefined;
        const enc = caps.ssh.secret;
        if (enc && (enc.privateKey || enc.passphrase || enc.password)) {
          try {
            const cipher = getSecretCipher();
            if (enc.privateKey) privateKey = cipher.decrypt(enc.privateKey);
            if (enc.passphrase) passphrase = cipher.decrypt(enc.passphrase);
            if (enc.password) password = cipher.decrypt(enc.password);
          } catch (error) {
            // Never crash a device read on a bad key / corrupt ciphertext;
            // fall back so SSH simply fails to connect rather than leaking.
            console.error(
              `Failed to decrypt SSH credentials for device ${persistence.id}: ${(error as Error).message}`
            );
          }
        }

        sshCredentials = {
          username: caps.ssh.username || 'pi',
          port: caps.ssh.port || 22,
          privateKey,
          passphrase,
          ...(password ? { password } : {}),
          ...(caps.ssh.hostKey ? { sshHostKey: caps.ssh.hostKey } : {}),
        };
      }
    }

    // Create device entity
    const device = DeviceEntity.create(
      id,
      name,
      customerId,
      status,
      ipAddress,
      tailscaleIp,
      persistence.hostname || undefined,
      sshCredentials
    );

    // Reconstruct metrics from Prisma fields
    if (persistence.cpuUsage !== null || persistence.memoryUsage !== null || persistence.diskUsage !== null) {
      device.metrics = {
        cpuUsage: persistence.cpuUsage || 0,
        memoryUsage: persistence.memoryUsage || 0,
        diskUsage: persistence.diskUsage || 0,
        uptime: persistence.uptime ? parseInt(persistence.uptime) : 0,
        timestamp: persistence.lastSeen ? new Date(persistence.lastSeen) : new Date()
      };
    }

    // Calculate lastHeartbeat from lastSeen (reverse of getLastSeen logic)
    if (persistence.lastSeen) {
      const lastSeenTime = new Date(persistence.lastSeen).getTime();
      device.lastHeartbeat = lastSeenTime - 120000; // Subtract 2 minutes
    } else {
      device.lastHeartbeat = 0;
    }

    // Set additional properties
    const capabilitiesArray = persistence.capabilities && typeof persistence.capabilities === 'object' 
      ? Object.keys(persistence.capabilities).filter(k => k !== 'ssh')
      : [];
    device.capabilities = capabilitiesArray;
    device.firmwareVersion = persistence.agentVersion || undefined;
    device.osVersion = persistence.architecture || undefined;

    device.publicId = persistence.publicId;
    device.createdAt = new Date(persistence.registeredAt || persistence.createdAt);
    device.updatedAt = new Date(persistence.updatedAt);
    device.deletedAt = persistence.deletedAt ? new Date(persistence.deletedAt) : undefined;

    // Hydrate extended display properties from persistence
    device.deviceType = persistence.deviceType || undefined;
    device.deviceModel = persistence.deviceModel || undefined;
    device.architecture = persistence.architecture || undefined;
    device.location = persistence.location || undefined;
    device.description = persistence.description || undefined;
    device.macAddress = persistence.macAddress || undefined;
    device.lastBoot = persistence.lastBoot ? new Date(persistence.lastBoot) : undefined;
    device.uptimeStr = persistence.uptime || undefined;
    device.cpuTemp = persistence.cpuTemp ?? undefined;
    device.memoryTotal = persistence.memoryTotal ?? undefined;
    device.diskTotal = persistence.diskTotal || undefined;
    device.loadAverage = persistence.loadAverage || undefined;
    device.temperature = persistence.temperature ?? undefined;
    device.batteryLevel = persistence.batteryLevel ?? undefined;
    device.signalStrength = persistence.signalStrength ?? undefined;
    device.appStatus = persistence.appStatus || undefined;
    device.agentVersion = persistence.agentVersion || undefined;

    return device;
  }

  static toPersistence(device: DeviceEntity): any {
    if (!device) {
      return null;
    }

    return device.toPersistence();
  }

  static toDto(device: DeviceEntity | null): DeviceDto | null {
    if (!device) {
      return null;
    }

    const customerId = device.getCustomerId();
    if (!customerId) {
      throw new Error('Device must have a customerId');
    }

    return {
      id: device.publicId,
      customerId: customerId.getValue(),
      name: device.name.getValue(),
      status: device.getStatusData(),
      ipAddress: device.getIpAddress()?.value || null,
      hostname: device.hostname || null,
      tailscaleIp: device.getTailscaleIp()?.value || null,
      isOnline: device.isOnline(),
      isActive: device.isActive(),
      connectionQuality: device.getConnectionQuality(),
      lastSeen: device.getLastSeen(),
      lastHeartbeat: device.lastHeartbeat,
      sshCredentials: device.sshCredentials ? {
        username: device.sshCredentials.username,
        port: device.sshCredentials.port
      } : null,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      isDeleted: device.isDeleted()
    };
  }

  static toListItemDto(device: DeviceEntity | null): DeviceListItemDTO | null {
    if (!device) {
      return null;
    }

    return {
      id: device.publicId,
      name: device.name.getValue(),
      status: device.getStatusData(),
      ipAddress: device.getIpAddress()?.value || null,
      isOnline: device.isOnline(),
      activeAlerts: 0 // Would come from alerts service
    };
  }

  static toDetailsDto(device: DeviceEntity | null): DeviceDetailsDTO | null {
    if (!device) {
      return null;
    }

    const baseDto = this.toDto(device);
    if (!baseDto) {
      return null;
    }

    const detailsDto: DeviceDetailsDTO = {
      ...baseDto,
      metrics: device.metrics ? {
        cpuUsage: device.metrics.cpuUsage,
        memoryUsage: device.metrics.memoryUsage,
        diskUsage: device.metrics.diskUsage,
        uptime: device.metrics.uptime
      } : undefined,
      activeAlerts: 0, // Would come from alerts service
      capabilities: device.getCapabilities() || [],
      firmwareVersion: device.getFirmwareVersion(),
      osVersion: device.getOsVersion(),
      lastCommandExecuted: undefined, // Would come from command service
      commandHistory: [] // Would come from command service
    };
    
    return detailsDto;
  }

  static toDetailDto(device: DeviceEntity | null): DeviceDetailDto | null {
    if (!device) {
      return null;
    }

    const customerId = device.getCustomerId();
    if (!customerId) {
      throw new Error('Device must have a customerId');
    }

    return {
      id: device.publicId,
      customerId: customerId.getValue(),
      name: device.name.getValue(),
      status: device.getStatusData(),
      ipAddress: device.getIpAddress()?.value || null,
      hostname: device.hostname || null,
      tailscaleIp: device.getTailscaleIp()?.value || null,
      isOnline: device.isOnline(),
      isActive: device.isActive(),
      connectionQuality: device.getConnectionQuality(),
      lastSeen: device.getLastSeen(),
      lastHeartbeat: device.lastHeartbeat,
      sshCredentials: device.sshCredentials ? {
        username: device.sshCredentials.username,
        port: device.sshCredentials.port
      } : null,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      isDeleted: device.isDeleted(),
      metrics: device.metrics || {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        uptime: 0
      },
      activeAlerts: 0,
      capabilities: device.getCapabilities(),
      firmwareVersion: device.getFirmwareVersion() || 'unknown',
      osVersion: device.getOsVersion() || 'unknown'
    };
  }

  static toSummaryDto(device: DeviceEntity | null): DeviceSummaryDto | null {
    if (!device) {
      return null;
    }

    return {
      id: device.publicId,
      name: device.name.getValue(),
      status: device.getStatusData(),
      ipAddress: device.getIpAddress()?.value || null,
      hostname: device.hostname || null,
      isOnline: device.isOnline(),
      connectionQuality: device.getConnectionQuality(),
      activeAlerts: 0, // Would come from alerts service
      lastSeen: device.getLastSeen()
    };
  }

  static fromCreateDto(dto: CreateDeviceDTO, customerId: CustomerId): DeviceEntity {
    const id = DeviceId.fromString(`device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const name = DeviceName.fromString(dto.name);
    
    let ipAddress: IpAddress | undefined;
    if (dto.ipAddress) {
      ipAddress = IpAddress.fromString(dto.ipAddress);
    }

    return DeviceEntity.create(
      id,
      name,
      customerId,
      DeviceStatus.offlineInactive(),
      ipAddress,
      undefined,
      undefined,
      dto.sshCredentials
    );
  }

  static fromUpdateDto(dto: UpdateDeviceDTO, device: DeviceEntity): DeviceEntity {
    if (dto.name) {
      device.updateName(DeviceName.fromString(dto.name));
    }

    if (dto.ipAddress !== undefined) {
      if (dto.ipAddress) {
        device.updateNetwork(dto.ipAddress, undefined, undefined);
      } else {
        device.ipAddress = undefined;
      }
    }

    if (dto.tailscaleIp !== undefined) {
      if (dto.tailscaleIp) {
        const tailscaleIp = IpAddress.fromString(dto.tailscaleIp);
        device.tailscaleIp = tailscaleIp;
      } else {
        device.tailscaleIp = undefined;
      }
    }

    if (dto.hostname !== undefined) {
      device.updateNetwork(undefined, undefined, dto.hostname);
    }

    if (dto.sshCredentials) {
      // Convert DTO SSH credentials to domain SSHCredentials interface
      // UpdateDeviceDTO.sshCredentials has optional fields, so we need to merge with existing
      const existingCreds = device.sshCredentials;
      const sshCreds: SSHCredentials = {
        username: dto.sshCredentials.username || existingCreds?.username || '',
        port: dto.sshCredentials.port || existingCreds?.port,
        privateKey: dto.sshCredentials.privateKey || existingCreds?.privateKey || 'password-based-auth',
        passphrase: dto.sshCredentials.passphrase || existingCreds?.passphrase
      };
      device.updateSshCredentials(sshCreds);
    }

    return device;
  }

  static toSearchResult(devices: DeviceEntity[], total: number, limit: number, offset: number): any {
    return {
      devices: devices.map(device => this.toSummaryDto(device)),
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }
}