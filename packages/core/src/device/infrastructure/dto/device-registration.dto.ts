/**
 * Data Transfer Object for Device Registration
 */
export interface DeviceRegistrationDTO {
  name: string;
  ipAddress: string;
  sshUsername: string;
  sshPassword?: string;
  sshPrivateKey?: string;
  customerId: string;
  registrationToken?: string;
  deviceType?: string;
  tags?: string[];
  description?: string;
}

/**
 * Data Transfer Object for Device Registration Request
 * Used when a device requests to be registered
 */
export interface DeviceRegistrationRequestDTO {
  registrationToken: string;
  hostname: string;
  ipAddress: string;
  macAddress: string;
  osInfo: string;
  cpuInfo: string;
  memoryInfo: string;
  diskInfo: string;
  deviceType?: string;
}

/**
 * Data Transfer Object for Device Registration Response
 * Sent back to the device after registration
 */
export interface DeviceRegistrationResponseDTO {
  success: boolean;
  deviceId?: string;
  message: string;
  error?: string;
  configurationUrl?: string;
  agentConfiguration?: {
    reportingInterval: number;
    logLevel: string;
    features: {
      metrics: boolean;
      logs: boolean;
      fileSystem: boolean;
      updates: boolean;
    };
  };
}

/**
 * Data Transfer Object for Device Registration Token
 */
export interface DeviceRegistrationTokenDTO {
  token: string;
  customerId: string;
  expiresAt: string;
  maxDevices: number;
  devicesRegistered: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

/**
 * Data Transfer Object for creating a Device Registration Token
 */
export interface CreateDeviceRegistrationTokenDTO {
  customerId: string;
  expiresAt?: string;
  maxDevices?: number;
  description?: string;
}

/**
 * Data Transfer Object for Device Registration Batch
 * Used for registering multiple devices at once
 */
export interface DeviceRegistrationBatchDTO {
  customerId: string;
  devices: {
    name: string;
    ipAddress: string;
    sshUsername: string;
    sshPassword?: string;
    sshPrivateKey?: string;
    deviceType?: string;
    tags?: string[];
    description?: string;
  }[];
}

/**
 * Data Transfer Object for Device Registration Batch Result
 */
export interface DeviceRegistrationBatchResultDTO {
  totalDevices: number;
  successCount: number;
  failureCount: number;
  results: {
    name: string;
    ipAddress: string;
    success: boolean;
    deviceId?: string;
    error?: string;
  }[];
}

/**
 * Data Transfer Object for Device Auto-Discovery
 */
export interface DeviceAutoDiscoveryDTO {
  customerId: string;
  networkRange: string;
  sshUsername: string;
  sshPassword?: string;
  sshPrivateKey?: string;
  timeout?: number;
  namePrefix?: string;
  tags?: string[];
}

/**
 * Data Transfer Object for Device Auto-Discovery Result
 */
export interface DeviceAutoDiscoveryResultDTO {
  customerId: string;
  devicesFound: number;
  devicesRegistered: number;
  scanDuration: number; // in seconds
  devices: {
    ipAddress: string;
    hostname?: string;
    macAddress?: string;
    deviceType?: string;
    osInfo?: string;
    status: 'registered' | 'discovered' | 'failed';
    deviceId?: string;
    error?: string;
  }[];
}