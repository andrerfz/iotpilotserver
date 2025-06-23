import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/types/alerts';

interface UseRealTimeAlertsOptions {
    deviceId?: string;
    onNewAlert?: (alert: Alert) => void;
    onAlertResolved?: (alert: Alert) => void;
    enableNotifications?: boolean;
}

export function useRealTimeAlerts(options: UseRealTimeAlertsOptions = {}) {
    const { deviceId, onNewAlert, onAlertResolved, enableNotifications = true } = options;
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Simulate WebSocket connection for real-time updates
    useEffect(() => {
        if (!deviceId) return;

        let intervalId: NodeJS.Timeout;
        let isActive = true;

        const connectToAlertStream = () => {
            setIsConnected(true);
            setConnectionError(null);

            // Simulate periodic checks for new alerts
            intervalId = setInterval(async () => {
                if (!isActive) return;

                try {
                    // Check for new alerts (in a real implementation, this would be WebSocket)
                    const response = await fetch(`/api/devices/${deviceId}/alerts?limit=5`);

                    if (!response.ok) {
                        throw new Error('Failed to fetch alerts');
                    }

                    const data = await response.json();

                    // Process new alerts
                    if (data.alerts && data.alerts.length > 0) {
                        const recentAlerts = data.alerts.filter((alert: Alert) => {
                            const alertTime = new Date(alert.createdAt).getTime();
                            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                            return alertTime > fiveMinutesAgo && !alert.resolved;
                        });

                        recentAlerts.forEach((alert: Alert) => {
                            if (onNewAlert) {
                                onNewAlert(alert);
                            }

                            if (enableNotifications) {
                                showAlertNotification(alert);
                            }
                        });
                    }

                } catch (error) {
                    console.error('Error checking for new alerts:', error);
                    setConnectionError(error instanceof Error ? error.message : 'Unknown error');
                }
            }, 30000); // Check every 30 seconds

            // Simulate connection success
            setTimeout(() => {
                if (isActive) {
                    setIsConnected(true);
                }
            }, 1000);
        };

        const disconnectFromAlertStream = () => {
            setIsConnected(false);
            if (intervalId) {
                clearInterval(intervalId);
            }
        };

        connectToAlertStream();

        // Cleanup on unmount
        return () => {
            isActive = false;
            disconnectFromAlertStream();
        };
    }, [deviceId, onNewAlert, onAlertResolved, enableNotifications]);

    const showAlertNotification = useCallback((alert: Alert) => {
        const severityConfig = {
            INFO: { color: 'info', icon: '💡' },
            WARNING: { color: 'warning', icon: '⚠️' },
            ERROR: { color: 'error', icon: '❌' },
            CRITICAL: { color: 'error', icon: '🚨' }
        };

        const config = severityConfig[alert.severity];

        if (alert.severity === 'CRITICAL') {
            toast.error(`${config.icon} ${alert.title}`, {
                description: alert.message,
                duration: 10000, // Show critical alerts longer
                action: {
                    label: 'View Details',
                    onClick: () => {
                        // Navigate to alert details
                        window.location.href = `/devices/${alert.deviceId}/alerts`;
                    }
                }
            });
        } else if (alert.severity === 'ERROR') {
            toast.error(`${config.icon} ${alert.title}`, {
                description: alert.message,
                duration: 7000,
            });
        } else if (alert.severity === 'WARNING') {
            toast.warning(`${config.icon} ${alert.title}`, {
                description: alert.message,
                duration: 5000,
            });
        } else {
            toast.info(`${config.icon} ${alert.title}`, {
                description: alert.message,
                duration: 4000,
            });
        }
    }, []);

    const acknowledgeAlert = useCallback(async (alertId: string) => {
        if (!deviceId) return false;

        try {
            const response = await fetch(`/api/devices/${deviceId}/alerts/${alertId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'acknowledge' })
            });

            if (!response.ok) {
                throw new Error('Failed to acknowledge alert');
            }

            toast.success('Alert acknowledged');
            return true;
        } catch (error) {
            toast.error('Failed to acknowledge alert');
            return false;
        }
    }, [deviceId]);

    const resolveAlert = useCallback(async (alertId: string, note?: string) => {
        if (!deviceId) return false;

        try {
            const response = await fetch(`/api/devices/${deviceId}/alerts/${alertId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'resolve',
                    note: note || 'Resolved via web interface',
                    resolvedBy: 'user'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to resolve alert');
            }

            const resolvedAlert = await response.json();

            if (onAlertResolved) {
                onAlertResolved(resolvedAlert);
            }

            toast.success('Alert resolved successfully');
            return true;
        } catch (error) {
            toast.error('Failed to resolve alert');
            return false;
        }
    }, [deviceId, onAlertResolved]);

    const createCustomAlert = useCallback(async (alertData: {
        type: string;
        severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
        title: string;
        message: string;
        metadata?: Record<string, any>;
    }) => {
        if (!deviceId) return false;

        try {
            const response = await fetch(`/api/devices/${deviceId}/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alertData)
            });

            if (!response.ok) {
                throw new Error('Failed to create alert');
            }

            const newAlert = await response.json();

            if (onNewAlert) {
                onNewAlert(newAlert);
            }

            toast.success('Alert created successfully');
            return newAlert;
        } catch (error) {
            toast.error('Failed to create alert');
            return false;
        }
    }, [deviceId, onNewAlert]);

    return {
        isConnected,
        connectionError,
        acknowledgeAlert,
        resolveAlert,
        createCustomAlert,
    };
}