export interface DeviceRegistrationDTO {
  id: string;
  deviceId: string;
  registrationToken: string;
  status: 'pending' | 'approved' | 'rejected';
  ipAddress: string;
  deviceInfo: DeviceInfoDTO;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface DeviceInfoDTO {
  hostname: string;
  platform: string;
  architecture: string;
  osVersion: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  totalDisk: number;
  macAddress?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
}

export interface CreateDeviceRegistrationDTO {
  registrationToken: string;
  ipAddress: string;
  deviceInfo: DeviceInfoDTO;
}

export interface UpdateDeviceRegistrationDTO {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface DeviceRegistrationListItemDTO {
  id: string;
  deviceId: string;
  status: 'pending' | 'approved' | 'rejected';
  ipAddress: string;
  hostname: string;
  platform: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceRegistrationFilterDTO {
  status?: 'pending' | 'approved' | 'rejected';
  ipAddress?: string;
  hostname?: string;
  platform?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface DeviceOnboardingDTO {
  registrationId: string;
  deviceId: string;
  name: string;
  ipAddress: string;
  sshCredentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
  tags?: string[];
  groupId?: string;
  initialConfiguration?: {
    enableMetricsCollection: boolean;
    enableAutoUpdates: boolean;
    enableRemoteAccess: boolean;
    enableNotifications: boolean;
  };
}

export interface DeviceRegistrationStatsDTO {
  totalDevices: number;
  pendingRegistrations: number;
  approvedRegistrations: number;
  rejectedRegistrations: number;
  registrationsToday: number;
  registrationsThisWeek: number;
  registrationsThisMonth: number;
}