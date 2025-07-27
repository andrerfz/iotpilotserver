export interface CustomerDto {
  id: string;
  customerId: string;
  name: string;
  description?: string;
  contactEmail?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerDetailDto extends CustomerDto {
  settings?: any;
  deviceCount: number;
  userCount: number;
  totalAlerts: number;
  isSuspended: boolean;
  suspensionReason?: string;
  quotaUsage: {
    devices: number;
    users: number;
    storage: number;
  };
}

export interface CreateCustomerDto {
  name: string;
  description?: string;
  contactEmail?: string;
  settings?: any;
}

export interface UpdateCustomerDto {
  name?: string;
  description?: string;
  contactEmail?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  settings?: any;
}
