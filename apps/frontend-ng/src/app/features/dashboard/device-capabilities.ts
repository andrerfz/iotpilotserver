// Local mirror of packages/core device-type.vo.ts capability checks.
// Only SSH capability is needed here — add others as modules require them.
const SSH_CAPABLE_MODELS = new Set(['PI_ZERO', 'PI_3', 'PI_4', 'PI_5', 'ORANGE_PI']);

export function hasSSH(deviceType: string | null | undefined): boolean {
  return SSH_CAPABLE_MODELS.has(deviceType ?? '');
}

const SENSOR_MODELS = new Set(['ESP8266_SENSOR', 'ESP32C3_SENSOR', 'HELTEC_LORA32V3_SENSOR']);

export const DEVICE_TYPES = [
  { key: 'PI_ZERO',                  label: 'Raspberry Pi Zero' },
  { key: 'PI_3',                     label: 'Raspberry Pi 3' },
  { key: 'PI_4',                     label: 'Raspberry Pi 4' },
  { key: 'PI_5',                     label: 'Raspberry Pi 5' },
  { key: 'ORANGE_PI',                label: 'Orange Pi' },
  { key: 'ESP8266_SENSOR',           label: 'ESP8266 Temperature Sensor' },
  { key: 'ESP32C3_SENSOR',           label: 'ESP32-C3 Temperature Sensor' },
  { key: 'HELTEC_LORA32V3_SENSOR',   label: 'Heltec WiFi LoRa 32 V3 Temperature Sensor' },
  { key: 'GENERIC',                  label: 'Generic Device' },
  { key: 'UNKNOWN',                  label: 'Unknown' },
];

export function isSensorDevice(deviceType: string | null | undefined): boolean {
  return SENSOR_MODELS.has(deviceType ?? '');
}

export function deviceTypeLabel(deviceType: string | null | undefined): string {
  return DEVICE_TYPES.find(d => d.key === deviceType)?.label ?? deviceType ?? 'Unknown';
}
