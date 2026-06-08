import {useCallback, useState} from 'react';
import {useQuery} from './use-query';
import {Alert} from '@/types/alert.types';
import { apiUrl } from '@/utils/api-url';

interface AlertQueryParams {
    deviceId?: string;
    severity?: string;
    status?: string;
    [key: string]: unknown;
}

export function useMonitoringQueries() {
    const listAlertsQuery = useQuery<AlertQueryParams, Alert[]>('/api/monitoring/alerts');

    const [alertDetail, setAlertDetail] = useState<Alert | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    const getAlertDetails = useCallback(async (id: string): Promise<Alert | null> => {
        setDetailLoading(true);
        setDetailError(null);
        try {
            const res = await fetch(apiUrl(`/api/monitoring/alerts/${id}`), {credentials: 'include'});
            if (!res.ok) throw new Error('Failed to fetch alert details');
            const body = await res.json();
            const data = (body.data ?? body) as Alert;
            setAlertDetail(data);
            return data;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to fetch alert details';
            setDetailError(msg);
            return null;
        } finally {
            setDetailLoading(false);
        }
    }, []);

    return {
        listAlerts: listAlertsQuery.execute,
        getAlertDetails,
        alertsData: listAlertsQuery.data,
        alertDetailsData: alertDetail,
        loading: listAlertsQuery.loading || detailLoading,
        error: listAlertsQuery.error || detailError,
    };
}
