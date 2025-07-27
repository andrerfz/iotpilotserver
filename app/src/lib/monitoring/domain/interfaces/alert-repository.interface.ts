import {Alert} from '../entities/alert.entity';
import {AlertId} from '../value-objects/alert-id.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {AlertSeverity} from '../value-objects/alert-severity.vo';
import {AlertStatus} from '../value-objects/alert-status.vo';
import {TimeRange} from '../value-objects/time-range.vo';

/**
 * Repository interface for alerts
 */
export interface AlertRepository {
    /**
     * Saves an alert to the repository
     * 
     * @param alert The alert to save
     * @returns A promise that resolves to the saved alert
     */
    save(alert: Alert): Promise<Alert>;
    
    /**
     * Finds an alert by its ID
     * 
     * @param id The ID of the alert to find
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to the alert or null if not found
     */
    findById(id: AlertId, tenantId: CustomerId): Promise<Alert | null>;
    
    /**
     * Finds alerts for a specific device
     * 
     * @param deviceId The ID of the device to find alerts for
     * @param tenantId The tenant ID for validation
     * @param timeRange Optional time range to filter alerts
     * @returns A promise that resolves to an array of alerts
     */
    findByDeviceId(deviceId: DeviceId, tenantId: CustomerId, timeRange?: TimeRange): Promise<Alert[]>;
    
    /**
     * Finds alerts for a specific threshold
     * 
     * @param thresholdId The ID of the threshold to find alerts for
     * @param tenantId The tenant ID for validation
     * @param timeRange Optional time range to filter alerts
     * @returns A promise that resolves to an array of alerts
     */
    findByThresholdId(thresholdId: ThresholdId, tenantId: CustomerId, timeRange?: TimeRange): Promise<Alert[]>;
    
    /**
     * Finds alerts by severity
     * 
     * @param severity The severity of the alerts to find
     * @param tenantId The tenant ID for validation
     * @param timeRange Optional time range to filter alerts
     * @returns A promise that resolves to an array of alerts
     */
    findBySeverity(severity: AlertSeverity, tenantId: CustomerId, timeRange?: TimeRange): Promise<Alert[]>;
    
    /**
     * Finds alerts by status
     * 
     * @param status The status of the alerts to find
     * @param tenantId The tenant ID for validation
     * @param timeRange Optional time range to filter alerts
     * @returns A promise that resolves to an array of alerts
     */
    findByStatus(status: AlertStatus, tenantId: CustomerId, timeRange?: TimeRange): Promise<Alert[]>;
    
    /**
     * Finds all alerts for a tenant
     * 
     * @param tenantId The tenant ID
     * @param timeRange Optional time range to filter alerts
     * @param limit Optional limit on the number of alerts to return
     * @param offset Optional offset for pagination
     * @returns A promise that resolves to an array of alerts
     */
    findAll(tenantId: CustomerId, timeRange?: TimeRange, limit?: number, offset?: number): Promise<Alert[]>;
    
    /**
     * Counts alerts for a tenant
     * 
     * @param tenantId The tenant ID
     * @param timeRange Optional time range to filter alerts
     * @returns A promise that resolves to the count of alerts
     */
    count(tenantId: CustomerId, timeRange?: TimeRange): Promise<number>;
    
    /**
     * Deletes an alert
     * 
     * @param id The ID of the alert to delete
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves when the alert is deleted
     */
    delete(id: AlertId, tenantId: CustomerId): Promise<void>;
}