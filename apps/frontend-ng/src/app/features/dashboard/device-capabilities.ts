/**
 * Frontend mirror of packages/core device-type.vo.ts capability registry.
 * Keep in sync with DEVICE_REGISTRY in device-type.vo.ts when adding new models.
 *
 * Individual helper functions are the public API — consumers must NOT check
 * device type strings directly. If a new model is added to the VO, add it here
 * and the UI adapts automatically.
 */

export interface DeviceCapabilities {
  label: string;
  // Power & connectivity
  batteryPowered: boolean;  // deep sleep + reportingInterval (vs always-on heartbeat)
  heartbeat: boolean;       // sends periodic keepalive
  // Hardware features
  ssh: boolean;
  temperatureSensor: boolean;
  // Metrics reported
  systemMetrics: boolean;   // CPU, memory, disk, load average
  sensorMetrics: boolean;   // temperature, battery, RSSI
  systemCharts: boolean;
  sensorCharts: boolean;
  // Remote capabilities
  commands: boolean;
  systemInfo: boolean;      // architecture, uptime, agent version
}

//                                        batt    hbeat   ssh     temp    sysMet  senMet  sysChrt senChrt cmds    sysInfo
const REGISTRY: Record<string, DeviceCapabilities> = {
  PI_ZERO:                { label: 'Raspberry Pi Zero',                         batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
  PI_3:                   { label: 'Raspberry Pi 3',                            batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
  PI_4:                   { label: 'Raspberry Pi 4',                            batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
  PI_5:                   { label: 'Raspberry Pi 5',                            batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
  ORANGE_PI:              { label: 'Orange Pi',                                 batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
  ESP8266_SENSOR:         { label: 'ESP8266 Temperature Sensor',                batteryPowered: true,  heartbeat: false, ssh: false, temperatureSensor: true,  systemMetrics: false, sensorMetrics: true,  systemCharts: false, sensorCharts: true,  commands: false, systemInfo: false },
  ESP32C3_SENSOR:         { label: 'ESP32-C3 Temperature Sensor (T-OI Plus)',   batteryPowered: true,  heartbeat: false, ssh: false, temperatureSensor: true,  systemMetrics: false, sensorMetrics: true,  systemCharts: false, sensorCharts: true,  commands: false, systemInfo: false },
  HELTEC_LORA32V3_SENSOR: { label: 'Heltec WiFi LoRa 32 V3 Temperature Sensor',batteryPowered: true,  heartbeat: false, ssh: false, temperatureSensor: true,  systemMetrics: false, sensorMetrics: true,  systemCharts: false, sensorCharts: true,  commands: false, systemInfo: false },
  GENERIC:                { label: 'Generic Device',                            batteryPowered: false, heartbeat: true,  ssh: false, temperatureSensor: false, systemMetrics: true,  sensorMetrics: true,  systemCharts: true,  sensorCharts: true,  commands: true,  systemInfo: true  },
  UNKNOWN:                { label: 'Unknown',                                   batteryPowered: false, heartbeat: false, ssh: false, temperatureSensor: false, systemMetrics: true,  sensorMetrics: true,  systemCharts: true,  sensorCharts: true,  commands: false, systemInfo: true  },
};

const FALLBACK = REGISTRY['UNKNOWN'];

export function getCapabilities(deviceType: string | null | undefined): DeviceCapabilities {
  return REGISTRY[deviceType ?? ''] ?? FALLBACK;
}

export function hasSSH(deviceType: string | null | undefined): boolean {
  return getCapabilities(deviceType).ssh;
}

export function hasCommands(deviceType: string | null | undefined): boolean {
  return getCapabilities(deviceType).commands;
}

export function hasSystemMetrics(deviceType: string | null | undefined): boolean {
  return getCapabilities(deviceType).systemMetrics;
}

export function hasSensorMetrics(deviceType: string | null | undefined): boolean {
  return getCapabilities(deviceType).sensorMetrics;
}

export function hasTemperatureSensor(deviceType: string | null | undefined): boolean {
  return getCapabilities(deviceType).temperatureSensor;
}

export function hasSystemCharts(deviceType: string | null | undefined): boolean {
  return getCapabilities(deviceType).systemCharts;
}

export function hasSensorCharts(deviceType: string | null | undefined): boolean {
  return getCapabilities(deviceType).sensorCharts;
}

export function hasSystemInfo(deviceType: string | null | undefined): boolean {
  return getCapabilities(deviceType).systemInfo;
}

export function hasHeartbeat(deviceType: string | null | undefined): boolean {
  return getCapabilities(deviceType).heartbeat;
}

export const DEVICE_TYPES = Object.entries(REGISTRY).map(([key, caps]) => ({
  key,
  label: caps.label,
}));

export function deviceTypeLabel(deviceType: string | null | undefined): string {
  return REGISTRY[deviceType ?? '']?.label ?? deviceType ?? 'Unknown';
}
