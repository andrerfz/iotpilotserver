import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceMetrics } from '../entities/device-metrics.entity';

export interface MetricsCollector {
    collectMetrics(deviceId: DeviceId): Promise<DeviceMetrics>;
    
    collectMetricsForAllDevices(): Promise<DeviceMetrics[]>;
    
    getLatestMetrics(deviceId: DeviceId): Promise<DeviceMetrics | null>;
    
    getMetricsHistory(
        deviceId: DeviceId,
        startDate: Date,
        endDate: Date
    ): Promise<DeviceMetrics[]>;
    
    saveMetrics(metrics: DeviceMetrics): Promise<void>;
}