export enum DeviceTypeEnum {
    ROUTER = 'router',
    SWITCH = 'switch',
    SERVER = 'server',
    GATEWAY = 'gateway',
    SENSOR = 'sensor',
    CAMERA = 'camera',
    OTHER = 'other'
}

// Hardware model types used in device settings/provisioning
export enum DeviceModelEnum {
    PI_ZERO        = 'PI_ZERO',
    PI_3           = 'PI_3',
    PI_4           = 'PI_4',
    PI_5           = 'PI_5',
    ORANGE_PI      = 'ORANGE_PI',
    ESP8266_SENSOR        = 'ESP8266_SENSOR',
    ESP32C3_SENSOR        = 'ESP32C3_SENSOR',
    HELTEC_LORA32V3_SENSOR = 'HELTEC_LORA32V3_SENSOR',
    GENERIC               = 'GENERIC',
    UNKNOWN        = 'UNKNOWN',
}

export interface DeviceModelCapabilities {
    label: string;
    // Power & connectivity
    batteryPowered: boolean;    // uses deep sleep + reportingInterval
    heartbeat: boolean;         // sends periodic keepalive (always-on devices)
    // Hardware features
    ssh: boolean;               // supports SSH terminal
    temperatureSensor: boolean; // has temperature sensor (DS18B20 etc.)
    // Metrics reported
    systemMetrics: boolean;     // CPU, memory, disk, load average
    sensorMetrics: boolean;     // temperature, battery, RSSI
    systemCharts: boolean;      // system metric charts over time
    sensorCharts: boolean;      // temperature/battery history charts
    // Remote capabilities
    commands: boolean;          // supports remote commands (reboot, update)
    systemInfo: boolean;        // reports architecture, uptime, agent version
}

export const DEVICE_REGISTRY: Record<DeviceModelEnum, DeviceModelCapabilities> = {
    //                                                label                                  battery  hbeat   ssh     temp    sysMet  senMet  sysChart senChart cmds    sysInfo
    [DeviceModelEnum.PI_ZERO]:        { label: 'Raspberry Pi Zero',                       batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
    [DeviceModelEnum.PI_3]:           { label: 'Raspberry Pi 3',                          batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
    [DeviceModelEnum.PI_4]:           { label: 'Raspberry Pi 4',                          batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
    [DeviceModelEnum.PI_5]:           { label: 'Raspberry Pi 5',                          batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
    [DeviceModelEnum.ORANGE_PI]:      { label: 'Orange Pi',                               batteryPowered: false, heartbeat: true,  ssh: true,  temperatureSensor: false, systemMetrics: true,  sensorMetrics: false, systemCharts: true,  sensorCharts: false, commands: true,  systemInfo: true  },
    [DeviceModelEnum.ESP8266_SENSOR]: { label: 'ESP8266 Temperature Sensor',              batteryPowered: true,  heartbeat: false, ssh: false, temperatureSensor: true,  systemMetrics: false, sensorMetrics: true,  systemCharts: false, sensorCharts: true,  commands: false, systemInfo: false },
    [DeviceModelEnum.ESP32C3_SENSOR]:         { label: 'ESP32-C3 Temperature Sensor (T-OI Plus)',        batteryPowered: true,  heartbeat: false, ssh: false, temperatureSensor: true,  systemMetrics: false, sensorMetrics: true,  systemCharts: false, sensorCharts: true,  commands: false, systemInfo: false },
    [DeviceModelEnum.HELTEC_LORA32V3_SENSOR]: { label: 'Heltec WiFi LoRa 32 V3 Temperature Sensor',      batteryPowered: true,  heartbeat: false, ssh: false, temperatureSensor: true,  systemMetrics: false, sensorMetrics: true,  systemCharts: false, sensorCharts: true,  commands: false, systemInfo: false },
    [DeviceModelEnum.GENERIC]:        { label: 'Generic Device',                          batteryPowered: false, heartbeat: true,  ssh: false, temperatureSensor: false, systemMetrics: true,  sensorMetrics: true,  systemCharts: true,  sensorCharts: true,  commands: true,  systemInfo: true  },
    [DeviceModelEnum.UNKNOWN]:        { label: 'Unknown',                                 batteryPowered: false, heartbeat: false, ssh: false, temperatureSensor: false, systemMetrics: true,  sensorMetrics: true,  systemCharts: true,  sensorCharts: true,  commands: false, systemInfo: true  },
};

export function getDeviceCapabilities(deviceType: string): DeviceModelCapabilities {
    return DEVICE_REGISTRY[deviceType as DeviceModelEnum] ?? DEVICE_REGISTRY[DeviceModelEnum.UNKNOWN];
}

export function isSensorDevice(deviceType: string): boolean {
    return getDeviceCapabilities(deviceType).batteryPowered;
}

export class DeviceType {
    private constructor(private readonly value: DeviceTypeEnum) {}

    get getValue(): DeviceTypeEnum {
        return this.value;
    }

    static create(value: string): DeviceType {
        if (!DeviceType.isValid(value)) {
            throw new Error(`Invalid device type: ${value}`);
        }
        return new DeviceType(value as DeviceTypeEnum);
    }

    static isValid(value: string): boolean {
        return Object.values(DeviceTypeEnum).includes(value as DeviceTypeEnum);
    }

    equals(other: DeviceType): boolean {
        return this.value === other.value;
    }

    toString(): string {
        return this.value;
    }
}