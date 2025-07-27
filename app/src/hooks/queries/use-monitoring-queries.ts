import {useQuery} from './use-query';
import {ListAlertsQuery} from '@/lib/monitoring/application/queries/list-alerts/list-alerts.query';
import {GetAlertDetailsQuery} from '@/lib/monitoring/application/queries/get-alert-details/get-alert-details.query';

// Simplified alert interface for API responses
interface AlertData {
    id: string;
    deviceId: string;
    severity: string;
    status: string;
    message: string;
    createdAt: Date;
    [key: string]: any; // Allow additional properties
}

/**
 * A hook for executing monitoring-specific queries via API calls.
 * @returns Functions to execute monitoring queries with loading, error, and data states.
 */
export function useMonitoringQueries() {
    const listAlertsQuery = useQuery<ListAlertsQuery, AlertData[]>('/api/monitoring/alerts');
    const getAlertDetailsQuery = useQuery<GetAlertDetailsQuery, AlertData>('/api/monitoring/alerts');

    return {
        listAlerts: listAlertsQuery.execute,
        getAlertDetails: getAlertDetailsQuery.execute,
        alertsData: listAlertsQuery.data,
        alertDetailsData: getAlertDetailsQuery.data,
        loading: listAlertsQuery.loading || getAlertDetailsQuery.loading,
        error: listAlertsQuery.error || getAlertDetailsQuery.error
    };
}

