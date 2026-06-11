import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export interface SensorReading {
    temperature: number;
    cycle?: number; // RTC wake cycle number (audit trail)
    offsetSeconds?: number; // seconds buffered offline (backdates timestamp)
}

export interface RecordSensorReadingData {
    deviceId: string;
    readings?: SensorReading[];  // Batch of up to 6 readings
    batteryLevel?: number;      // 0-100% from ADC
    rssi?: number;              // WiFi signal strength
    firmwareVersion?: string;
    alertPending?: boolean;     // Was threshold exceeded in this batch?
    alertTemp?: number;         // Temperature that triggered alert
    batteryVoltage?: number;
    batteryLow?: boolean;
}

/**
 * Command to record a batch of temperature sensor readings from an ESP8266 device.
 * Stores each reading individually in DeviceMetric for time-series querying.
 * Creates an alert if temperature exceeded thresholds.
 */
export class RecordSensorReadingCommand extends TenantAwareCommand {
    static readonly type = 'RecordSensorReadingCommand';

    constructor(
        public readonly data: RecordSensorReadingData,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(
        data: RecordSensorReadingData,
        tenantContext: TenantContext
    ): RecordSensorReadingCommand {
        return new RecordSensorReadingCommand(data, tenantContext);
    }
}
