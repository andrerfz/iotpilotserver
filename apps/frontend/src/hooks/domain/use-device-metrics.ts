import {useCallback, useEffect, useState} from 'react';
import { apiUrl } from '@/utils/api-url';

interface MetricDataPoint {
    timestamp: string;
    value: number;
    unit?: string;
}

type MetricsByType = Record<string, MetricDataPoint[]>;

/**
 * Hook for fetching device metrics from the API.
 * Polls at the given interval and returns metrics grouped by type.
 */
export function useDeviceMetrics(deviceId: string, interval: number = 30000) {
    const [metrics, setMetrics] = useState<MetricsByType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        try {
            const response = await fetch(apiUrl(`/api/devices/${deviceId}/metrics?period=24h`), {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch metrics: ${response.status}`);
            }

            const result = await response.json();
            if (result.success && result.data?.metrics) {
                setMetrics(result.data.metrics);
                setError(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    useEffect(() => {
        fetchMetrics();
        const timer = setInterval(fetchMetrics, interval);
        return () => clearInterval(timer);
    }, [fetchMetrics, interval]);

    return {
        metrics,
        loading,
        error,
        refresh: fetchMetrics
    };
}
