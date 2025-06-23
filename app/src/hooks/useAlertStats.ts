import { useEffect, useState } from 'react';
import { Alert, AlertStats } from '@/types/alerts';

export function useAlertStats(deviceId: string, refreshInterval: number = 60000) {
    const [stats, setStats] = useState<AlertStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!deviceId) return;

        let intervalId: NodeJS.Timeout;
        let isActive = true;

        const fetchStats = async () => {
            try {
                setError(null);

                const response = await fetch(`/api/devices/${deviceId}/alerts?limit=1000`);

                if (!response.ok) {
                    throw new Error('Failed to fetch alert stats');
                }

                const data = await response.json();

                if (isActive) {
                    setStats(data.stats || calculateStats(data.alerts || []));
                    setLoading(false);
                }
            } catch (err) {
                if (isActive) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                    setLoading(false);
                }
            }
        };

        const calculateStats = (alerts: Alert[]): AlertStats => {
            const now = new Date();
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date(now);
                date.setDate(date.getDate() - (6 - i));
                return date.toDateString();
            });

            const trend = last7Days.map(dateStr => ({
                date: dateStr,
                count: alerts.filter(alert =>
                    new Date(alert.createdAt).toDateString() === dateStr
                ).length
            }));

            const byType: Record<string, number> = {};
            alerts.forEach(alert => {
                byType[alert.type] = (byType[alert.type] || 0) + 1;
            });

            return {
                total: alerts.length,
                active: alerts.filter(a => !a.resolved).length,
                resolved: alerts.filter(a => a.resolved).length,
                critical: alerts.filter(a => a.severity === 'CRITICAL' && !a.resolved).length,
                bySeverity: {
                    INFO: alerts.filter(a => a.severity === 'INFO').length,
                    WARNING: alerts.filter(a => a.severity === 'WARNING').length,
                    ERROR: alerts.filter(a => a.severity === 'ERROR').length,
                    CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
                },
                byType,
                trend
            };
        };

        // Initial fetch
        fetchStats();

        // Set up periodic refresh
        intervalId = setInterval(fetchStats, refreshInterval);

        return () => {
            isActive = false;
            clearInterval(intervalId);
        };
    }, [deviceId, refreshInterval]);

    return { stats, loading, error, refetch: () => setLoading(true) };
}