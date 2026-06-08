import {Threshold, ThresholdType} from '../entities/threshold.entity';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {AlertSeverity} from '../value-objects/alert-severity.vo';

/**
 * Repository interface for thresholds
 */
export interface ThresholdRepository {
    /**
     * Saves a threshold to the repository
     * 
     * @param threshold The threshold to save
     * @returns A promise that resolves to the saved threshold
     */
    save(threshold: Threshold): Promise<Threshold>;
    
    /**
     * Finds a threshold by its ID
     * 
     * @param id The ID of the threshold to find
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to the threshold or null if not found
     */
    findById(id: ThresholdId, tenantId: CustomerId): Promise<Threshold | null>;
    
    /**
     * Finds thresholds for a specific device
     * 
     * @param deviceId The ID of the device to find thresholds for
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to an array of thresholds
     */
    findByDeviceId(deviceId: DeviceId, tenantId: CustomerId): Promise<Threshold[]>;
    
    /**
     * Finds global thresholds (not associated with a specific device)
     * 
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to an array of global thresholds
     */
    findGlobalThresholds(tenantId: CustomerId): Promise<Threshold[]>;
    
    /**
     * Finds thresholds by type
     * 
     * @param type The type of thresholds to find
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to an array of thresholds
     */
    findByType(type: ThresholdType, tenantId: CustomerId): Promise<Threshold[]>;
    
    /**
     * Finds thresholds by metric name
     * 
     * @param metricName The metric name to find thresholds for
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to an array of thresholds
     */
    findByMetricName(metricName: string, tenantId: CustomerId): Promise<Threshold[]>;
    
    /**
     * Finds thresholds by severity
     * 
     * @param severity The severity of thresholds to find
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to an array of thresholds
     */
    findBySeverity(severity: AlertSeverity, tenantId: CustomerId): Promise<Threshold[]>;
    
    /**
     * Finds all thresholds for a tenant
     * 
     * @param tenantId The tenant ID
     * @param includeDisabled Whether to include disabled thresholds
     * @returns A promise that resolves to an array of thresholds
     */
    findAll(tenantId: CustomerId, includeDisabled?: boolean): Promise<Threshold[]>;
    
    /**
     * Finds all applicable thresholds for a device (including global thresholds)
     * 
     * @param deviceId The ID of the device to find thresholds for
     * @param tenantId The tenant ID for validation
     * @param includeDisabled Whether to include disabled thresholds
     * @returns A promise that resolves to an array of thresholds
     */
    findApplicableThresholds(deviceId: DeviceId, tenantId: CustomerId, includeDisabled?: boolean): Promise<Threshold[]>;
    
    /**
     * Finds a threshold by its name within a tenant
     * 
     * @param name The name of the threshold to find
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to the threshold or null if not found
     */
    findByName(name: string, tenantId: CustomerId): Promise<Threshold | null>;
    
    /**
     * Deletes a threshold
     * 
     * @param id The ID of the threshold to delete
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves when the threshold is deleted
     */
    delete(id: ThresholdId, tenantId: CustomerId): Promise<void>;
}