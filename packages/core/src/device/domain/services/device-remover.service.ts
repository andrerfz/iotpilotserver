import {DeviceId} from '../value-objects/device-id.vo';

export interface DeviceRemover {
  removeDevice(deviceId: DeviceId): Promise<void>;
  forceRemoveDevice(deviceId: DeviceId): Promise<void>;
}

// NOTE: Implementation lives in infrastructure. This file defines the domain contract only.