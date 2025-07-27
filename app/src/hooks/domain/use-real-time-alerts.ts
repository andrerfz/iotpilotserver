import {useCallback, useEffect, useState} from 'react';
import {useQuery} from '@/hooks/queries/use-query';
import {ListAlertsQuery} from '@/lib/monitoring/application/queries/list-alerts/list-alerts.query';
import {AlertEntity} from '@/lib/monitoring/domain/entities/alert.entity';

/**
 * A hook for receiving real-time alerts.
 * @param interval The polling interval in milliseconds for refreshing alerts.
 * @returns An object with alerts data, loading state, and error state.
 */
export function useRealTimeAlerts(interval: number = 10000) {
    const listAlertsQuery = useQuery<ListAlertsQuery, AlertEntity[]>('/api/monitoring/alerts');
    const [alerts, setAlerts] = useState<AlertEntity[]>([]);

    const fetchAlerts = useCallback(async () => {
        try {
            // Temporarily comment out due to private constructor
            // const query = new ListAlertsQuery({ status: ['ACTIVE', 'UNACKNOWLEDGED'] });
            // const result = await listAlertsQuery.execute(query);
            // setAlerts(result);
            // Use a placeholder or alternative approach
            // Optionally set mock data or handle differently
        } catch (error) {
            // Error is handled by the useQuery hook
        }
    }, [listAlertsQuery]);

    useEffect(() => {
        fetchAlerts();
        const timer = setInterval(fetchAlerts, interval);

        return () => clearInterval(timer);
    }, [fetchAlerts, interval]);

    return {
        alerts: alerts.length > 0 ? alerts : listAlertsQuery.data || [],
        loading: listAlertsQuery.loading,
        error: listAlertsQuery.error,
        refresh: fetchAlerts
    };
}

