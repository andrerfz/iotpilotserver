export interface DeviceDTO {
  id: string;
  name: string;
  ipAddress: string;
  status: string;
  sshCredentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceDTO {
  name: string;
  ipAddress: string;
  sshCredentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
}

export interface UpdateDeviceDTO {
  name?: string;
  ipAddress?: string;
  status?: string;
  sshCredentials?: {
    username: string;
    password?: string;
    privateKey?: string;
  };
}

export interface DeviceListItemDTO {
  id: string;
  name: string;
  ipAddress: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceFilterDTO {
  status?: string;
  name?: string;
  ipAddress?: string;
  createdAfter?: string;
  createdBefore?: string;
}