/**
 * Re-exports device capability helpers from the domain VO.
 * Import from here for UI components; import from the VO directly for domain logic.
 */
export type {DeviceModelCapabilities as DeviceCapabilities} from './domain/value-objects/device-type.vo';
export {getDeviceCapabilities, DEVICE_REGISTRY} from './domain/value-objects/device-type.vo';
