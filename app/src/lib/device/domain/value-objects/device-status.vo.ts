export type BusinessStatus = 'active' | 'inactive' | 'maintenance' | 'error' | 'retired';
export type ConnectivityStatus = 'online' | 'offline' | 'unknown' | 'disconnected';

export interface DeviceStatusData {
  businessStatus: BusinessStatus;
  connectivity: ConnectivityStatus;
  lastSeen?: Date;
}

import {ValueObjectValidationException} from '@/lib/shared/domain/exceptions/value-object-validation.exception';

export class DeviceStatus {
  private static readonly VALID_BUSINESS_STATUSES: BusinessStatus[] = ['active', 'inactive', 'maintenance', 'error', 'retired'];
  private static readonly VALID_CONNECTIVITY_STATUSES: ConnectivityStatus[] = ['online', 'offline', 'unknown', 'disconnected'];

  readonly businessStatus: BusinessStatus;
  readonly connectivity: ConnectivityStatus;
  readonly lastSeen?: Date;

  constructor(data: DeviceStatusData) {
    const { businessStatus, connectivity, lastSeen } = data;

    // Validate business status
    if (!DeviceStatus.VALID_BUSINESS_STATUSES.includes(businessStatus)) {
      throw new ValueObjectValidationException(`Invalid business status: ${businessStatus}`, 'businessStatus', { value: businessStatus });
    }

    // Validate connectivity status
    if (!DeviceStatus.VALID_CONNECTIVITY_STATUSES.includes(connectivity)) {
      throw new ValueObjectValidationException(`Invalid connectivity status: ${connectivity}`, 'connectivity', { value: connectivity });
    }

    this.businessStatus = businessStatus;
    this.connectivity = connectivity;
    this.lastSeen = lastSeen;
  }

  // Legacy compatibility getter (returns business status for backward compatibility)
  get value(): BusinessStatus {
    return this.businessStatus;
  }

  getValue(): BusinessStatus {
    return this.businessStatus;
  }

  // Business status checks
  isActive(): boolean {
    return this.businessStatus === 'active';
  }

  isInactive(): boolean {
    return this.businessStatus === 'inactive';
  }

  isInMaintenance(): boolean {
    return this.businessStatus === 'maintenance';
  }

  isInError(): boolean {
    return this.businessStatus === 'error';
  }

  isRetired(): boolean {
    return this.businessStatus === 'retired';
  }

  // Connectivity status checks
  isOnline(): boolean {
    return this.connectivity === 'online';
  }

  isOffline(): boolean {
    return this.connectivity === 'offline';
  }

  isUnknown(): boolean {
    return this.connectivity === 'unknown';
  }

  isDisconnected(): boolean {
    return this.connectivity === 'disconnected';
  }

  // Combined status checks
  isOnlineAndActive(): boolean {
    return this.isOnline() && this.isActive();
  }

  isOfflineButActive(): boolean {
    return this.isOffline() && this.isActive();
  }

  isOnlineButNotActive(): boolean {
    return this.isOnline() && !this.isActive();
  }

  equals(other: DeviceStatus): boolean {
    if (!(other instanceof DeviceStatus)) return false;

    return this.businessStatus === other.businessStatus &&
      this.connectivity === other.connectivity &&
      this.lastSeen?.getTime() === other.lastSeen?.getTime();
  }

  toJSON(): DeviceStatusData {
    return {
      businessStatus: this.businessStatus,
      connectivity: this.connectivity,
      lastSeen: this.lastSeen
    };
  }

  toString(): string {
    return `${this.businessStatus}:${this.connectivity}`;
  }

  static create(statusData: DeviceStatusData): DeviceStatus {
    return new DeviceStatus(statusData);
  }

  static fromString(status: string): DeviceStatus {
    // Parse "businessStatus:connectivity" format
    const parts = status.split(':');
    if (parts.length === 2) {
      return new DeviceStatus({
        businessStatus: parts[0] as BusinessStatus,
        connectivity: parts[1] as ConnectivityStatus
      });
    }
    // Assume it's just business status with default connectivity
    return new DeviceStatus({
      businessStatus: status as BusinessStatus,
      connectivity: 'offline'
    });
  }

  // Backward compatibility: create from old single status
  static createFromLegacyStatus(status: string, connectivity: ConnectivityStatus = 'offline', lastSeen?: Date): DeviceStatus {
    return new DeviceStatus({
      businessStatus: status as BusinessStatus,
      connectivity,
      lastSeen
    });
  }

  // Convenience methods for common states
  static onlineAndActive(lastSeen?: Date): DeviceStatus {
    return new DeviceStatus({ businessStatus: 'active', connectivity: 'online', lastSeen });
  }

  static offlineButActive(lastSeen?: Date): DeviceStatus {
    return new DeviceStatus({ businessStatus: 'active', connectivity: 'offline', lastSeen });
  }

  static onlineMaintenance(lastSeen?: Date): DeviceStatus {
    return new DeviceStatus({ businessStatus: 'maintenance', connectivity: 'online', lastSeen });
  }

  static offlineInactive(lastSeen?: Date): DeviceStatus {
    return new DeviceStatus({ businessStatus: 'inactive', connectivity: 'offline', lastSeen });
  }

  static onlineError(lastSeen?: Date): DeviceStatus {
    return new DeviceStatus({ businessStatus: 'error', connectivity: 'online', lastSeen });
  }

  static retired(): DeviceStatus {
    return new DeviceStatus({ businessStatus: 'retired', connectivity: 'disconnected' });
  }
}
