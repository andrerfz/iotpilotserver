export type AlertType =
    | 'DEVICE_OFFLINE'
    | 'HIGH_CPU'
    | 'HIGH_MEMORY'
    | 'HIGH_TEMPERATURE'
    | 'LOW_DISK_SPACE'
    | 'APPLICATION_ERROR'
    | 'SYSTEM_ERROR'
    | 'SECURITY_ALERT'
    | 'CUSTOM';

export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface Alert {
    id: string;
    deviceId: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    source?: string;
    resolved: boolean;
    resolvedAt?: string;
    acknowledgedAt?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}

export interface AlertStats {
    total: number;
    active: number;
    resolved: number;
    critical: number;
    bySeverity: {
        INFO: number;
        WARNING: number;
        ERROR: number;
        CRITICAL: number;
    };
    byType: Record<string, number>;
    trend: Array<{ date: string; count: number }>;
}

export interface AlertConfig {
    cpuThreshold: number;
    memoryThreshold: number;
    temperatureThreshold: number;
    diskThreshold: number;
    enableEmailNotifications: boolean;
    enablePushNotifications: boolean;
    alertTypes: Record<string, boolean>;
}

export const ALERT_TYPES = [
    { key: 'DEVICE_OFFLINE', label: 'Device Offline', description: 'When device stops sending heartbeats' },
    { key: 'HIGH_CPU', label: 'High CPU Usage', description: 'CPU usage exceeds threshold' },
    { key: 'HIGH_MEMORY', label: 'High Memory Usage', description: 'Memory usage exceeds threshold' },
    { key: 'HIGH_TEMPERATURE', label: 'High Temperature', description: 'Temperature exceeds safe limits' },
    { key: 'LOW_DISK_SPACE', label: 'Low Disk Space', description: 'Disk usage exceeds threshold' },
    { key: 'APPLICATION_ERROR', label: 'Application Error', description: 'IoT application errors' },
    { key: 'SYSTEM_ERROR', label: 'System Error', description: 'System-level errors' },
    { key: 'SECURITY_ALERT', label: 'Security Alert', description: 'Security-related events' }
] as const;