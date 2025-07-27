import {DeviceStatusData} from '../../domain/value-objects/device-status.vo';

export interface DeviceDto {
  id: string;
  customerId: string;
  name: string;
  status: DeviceStatusData;
  ipAddress: string | null;
  hostname: string | null;
  tailscaleIp: string | null;
  isOnline: boolean;
  isActive: boolean;
  connectionQuality: 'good' | 'fair' | 'poor' | 'disconnected';
  lastSeen: Date | null;
  lastHeartbeat: number;
  sshCredentials?: {
    username: string;
    port?: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// Add missing DTOs for mapper
export interface DeviceListItemDTO {
  id: string;
  name: string;
  status: DeviceStatusData;
  ipAddress: string | null;
  isOnline: boolean;
  activeAlerts: number;
}

export interface DeviceDetailsDTO extends DeviceDto {
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
  activeAlerts: number;
  capabilities?: string[];
  firmwareVersion?: string;
  osVersion?: string;
  lastCommandExecuted?: string;
  commandHistory?: string[];
}

export interface CreateDeviceDTO {
  name: string;
  ipAddress?: string;
  hostname?: string;
  sshCredentials?: {
    username: string;
    port?: number;
    privateKey: string;
    passphrase?: string;
  };
}

export interface UpdateDeviceDTO {
  name?: string;
  ipAddress?: string;
  tailscaleIp?: string;
  hostname?: string;
  sshCredentials?: {
    username?: string;
    port?: number;
    privateKey?: string;
    passphrase?: string;
  };
}

export interface DeviceDetailDto extends DeviceDto {
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
  activeAlerts: number;
  capabilities: string[];
  firmwareVersion: string;
  osVersion: string;
}

export interface DeviceSummaryDto {
  id: string;
  name: string;
  status: DeviceStatusData;
  ipAddress: string | null;
  hostname: string | null;
  isOnline: boolean;
  connectionQuality: 'good' | 'fair' | 'poor' | 'disconnected';
  activeAlerts: number;
  lastSeen: Date | null;
}