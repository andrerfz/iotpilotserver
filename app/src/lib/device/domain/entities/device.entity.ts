// Core imports for standalone entity
import {TenantScopedEntity} from '@/lib/shared/domain/entities/tenant-scoped.entity';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {DeviceStatus, DeviceStatusData} from '../value-objects/device-status.vo';
import {IpAddress} from '../value-objects/ip-address.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

export interface DeviceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  timestamp: Date;
}

export interface SSHCredentials {
  username: string;
  port?: number;
  privateKey: string;
  passphrase?: string;
}

export class DeviceEntity extends TenantScopedEntity<DeviceId> {
  private _name: DeviceName;
  public status: DeviceStatus;
  public ipAddress?: IpAddress;
  public tailscaleIp?: IpAddress;
  public hostname?: string;
  public sshCredentials?: SSHCredentials;
  public lastHeartbeat: number = 0;
  public capabilities?: string[];
  public firmwareVersion?: string;
  public osVersion?: string;
  public metrics?: DeviceMetrics;
  public createdAt: Date;
  public updatedAt: Date;
  public deletedAt?: Date;

  constructor(
    id: DeviceId,
    name: DeviceName,
    customerId: CustomerId,
    status: DeviceStatus,
    ipAddress?: IpAddress,
    tailscaleIp?: IpAddress,
    hostname?: string,
    sshCredentials?: SSHCredentials
  ) {
    super(id, customerId);
    this._name = name;
    this.status = status;
    this.ipAddress = ipAddress;
    this.tailscaleIp = tailscaleIp;
    this.hostname = hostname;
    this.sshCredentials = sshCredentials;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Public getter for name
  get name(): DeviceName {
    return this._name;
  }

  getId(): DeviceId {
    return this._entityId;
  }

  static create(
    id: DeviceId,
    name: DeviceName,
    customerId: CustomerId,
    status: DeviceStatus = DeviceStatus.offlineInactive(),
    ipAddress?: IpAddress,
    tailscaleIp?: IpAddress,
    hostname?: string,
    sshCredentials?: SSHCredentials
  ): DeviceEntity {
    return new DeviceEntity(id, name, customerId, status, ipAddress, tailscaleIp, hostname, sshCredentials);
  }

  // Network property getters for null safety
  getIpAddress(): IpAddress | undefined {
    return this.ipAddress;
  }

  getTailscaleIp(): IpAddress | undefined {
    return this.tailscaleIp;
  }

  // Status and connectivity methods
  isOnline(): boolean {
    return this.status.connectivity === 'online';
  }

  isActive(): boolean {
    return this.status.businessStatus === 'active';
  }

  getConnectionQuality(): 'good' | 'fair' | 'poor' | 'disconnected' {
    if (!this.isOnline()) return 'disconnected';

    const lastSeen = this.getLastSeen();
    if (!lastSeen) return 'poor';

    const minutesSinceLastSeen = (Date.now() - lastSeen.getTime()) / 1000 / 60;
    if (minutesSinceLastSeen < 2) return 'good';
    if (minutesSinceLastSeen < 5) return 'fair';
    return 'poor';
  }

  getLastSeen(): Date | null {
    if (this.lastHeartbeat === 0) return null;
    return new Date(this.lastHeartbeat + 120000);
  }

  getStatusData(): DeviceStatusData {
    return {
      businessStatus: this.status.businessStatus,
      connectivity: this.status.connectivity,
      lastSeen: this.getLastSeen() || undefined
    };
  }

  getCapabilities(): string[] {
    return this.capabilities || [];
  }

  getFirmwareVersion(): string | undefined {
    return this.firmwareVersion;
  }

  getOsVersion(): string | undefined {
    return this.osVersion;
  }

  // Business methods for updating state
  updateName(newName: DeviceName): void {
    this._name = newName;
    this.updatedAt = new Date();
  }

  updateNetwork(
    ipAddress?: string,
    tailscaleIp?: string,
    hostname?: string
  ): void {
    if (ipAddress) {
      this.ipAddress = IpAddress.fromString(ipAddress);
    }
    if (tailscaleIp) {
      this.tailscaleIp = IpAddress.fromString(tailscaleIp);
    }
    if (hostname) {
      this.hostname = hostname;
    }
    this.updatedAt = new Date();
  }

  updateSshCredentials(credentials: SSHCredentials): void {
    this.sshCredentials = credentials;
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: DeviceStatus): void {
    if (this.status.businessStatus !== newStatus.businessStatus ||
      this.status.connectivity !== newStatus.connectivity) {
      this.status = newStatus;
      this.updatedAt = new Date();
    }
  }

  updateMetrics(metrics: DeviceMetrics): void {
    this.metrics = metrics;
    this.updatedAt = new Date();
  }

  updateHeartbeat(timestamp: number): void {
    this.lastHeartbeat = timestamp;
    this.updatedAt = new Date();

    // Auto-update connectivity based on heartbeat
    if (Date.now() - timestamp < 120000) {
      if (this.status.connectivity !== 'online') {
        this.status = new DeviceStatus({
          businessStatus: this.status.businessStatus,
          connectivity: 'online',
          lastSeen: new Date(timestamp)
        });
      }
    }
  }

  updateCapabilities(capabilities: string[]): void {
    this.capabilities = capabilities;
    this.updatedAt = new Date();
  }

  updateVersions(firmwareVersion?: string, osVersion?: string): void {
    if (firmwareVersion) this.firmwareVersion = firmwareVersion;
    if (osVersion) this.osVersion = osVersion;
    this.updatedAt = new Date();
  }

  // Lifecycle methods
  activate(): void {
    this.status = new DeviceStatus({
      businessStatus: 'active',
      connectivity: this.status.connectivity,
      lastSeen: this.status.lastSeen
    });
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.status = new DeviceStatus({
      businessStatus: 'inactive',
      connectivity: this.status.connectivity,
      lastSeen: this.status.lastSeen
    });
    this.updatedAt = new Date();
  }

  setMaintenanceMode(): void {
    this.status = new DeviceStatus({
      businessStatus: 'maintenance',
      connectivity: this.status.connectivity,
      lastSeen: this.status.lastSeen
    });
    this.updatedAt = new Date();
  }

  retire(): void {
    this.status = new DeviceStatus({
      businessStatus: 'retired',
      connectivity: 'disconnected',
      lastSeen: this.status.lastSeen
    });
    this.updatedAt = new Date();
  }

  softDelete(): void {
    if (this.deletedAt) {
      throw new Error(`Device ${this.getId().getValue()} is already soft deleted`);
    }
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  restore(): void {
    if (!this.deletedAt) {
      throw new Error(`Device ${this.getId().getValue()} is not soft deleted`);
    }
    this.deletedAt = undefined;
    this.updatedAt = new Date();
  }

  isDeleted(): boolean {
    return !!this.deletedAt;
  }

  // Required method implementations
  getAggregateId(): string {
    return this.id.value;
  }

  getCustomerId(): CustomerId {
    return this.customerId!;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getDeletedAt(): Date | undefined {
    return this.deletedAt;
  }

  // Persistence mapping
  toPersistence(): Record<string, unknown> {
    const deviceType = this.hostname?.toLowerCase().includes('pi') ? 'PI_4' : 'GENERIC';
    
    return {
      id: this.getId().getValue(),
      deviceId: this.getId().getValue(), // deviceId is the same as id for new devices
      customerId: this.getCustomerId()?.getValue(),
      hostname: this.hostname || null,
      deviceType: deviceType,
      architecture: this.osVersion || null,
      name: this.name.getValue(),
      status: this.status.connectivity === 'online' ? 'ONLINE' : 'OFFLINE',
      ipAddress: this.ipAddress?.value || null,
      tailscaleIp: this.tailscaleIp?.value || null,
      macAddress: null, // Could be extracted from deviceId if format is MAC-based
      capabilities: this.capabilities || {},
      lastSeen: this.getLastSeen(),
      lastBoot: null,
      uptime: this.metrics?.uptime?.toString() || null,
      cpuUsage: this.metrics?.cpuUsage || null,
      cpuTemp: null,
      memoryUsage: this.metrics?.memoryUsage || null,
      memoryTotal: null,
      diskUsage: this.metrics?.diskUsage || null,
      diskTotal: null,
      loadAverage: null,
      appStatus: 'UNKNOWN',
      agentVersion: this.firmwareVersion || null,
      userId: null,
      registeredAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt || null
    };
  }

  // Set timestamps for hydration from persistence
  setTimestamps(createdAt: Date, updatedAt: Date, deletedAt?: Date): void {
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deletedAt = deletedAt;
  }
}

// Export for compatibility
export type Device = DeviceEntity;
