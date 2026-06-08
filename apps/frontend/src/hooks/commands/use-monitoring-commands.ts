import {useCallback, useState} from 'react';
import {useCommand} from './use-command';
import { apiUrl } from '@/utils/api-url';

interface CreateAlertPayload {
    deviceId: string;
    thresholdId?: string;
    severity: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

interface AlertResult {
    id: string;
    deviceId: string;
    severity: string;
    status: string;
}

export function useMonitoringCommands() {
    const createAlertCommand = useCommand<CreateAlertPayload, AlertResult>('/api/monitoring/alerts');

    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // PUT /api/monitoring/alerts/{publicId} with action: 'acknowledge'
    const acknowledgeAlert = useCallback(async (publicId: string): Promise<AlertResult | null> => {
        setActionLoading(true);
        setActionError(null);
        try {
            const res = await fetch(apiUrl(`/api/monitoring/alerts/${publicId}`), {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({action: 'acknowledge'}),
            });
            if (!res.ok) throw new Error(`Acknowledge failed: ${res.status}`);
            const body = await res.json();
            return (body.data ?? body) as AlertResult;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to acknowledge alert';
            setActionError(msg);
            return null;
        } finally {
            setActionLoading(false);
        }
    }, []);

    // PUT /api/monitoring/alerts/{publicId} with action: 'resolve'
    const resolveAlert = useCallback(async (publicId: string): Promise<AlertResult | null> => {
        setActionLoading(true);
        setActionError(null);
        try {
            const res = await fetch(apiUrl(`/api/monitoring/alerts/${publicId}`), {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({action: 'resolve'}),
            });
            if (!res.ok) throw new Error(`Resolve failed: ${res.status}`);
            const body = await res.json();
            return (body.data ?? body) as AlertResult;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to resolve alert';
            setActionError(msg);
            return null;
        } finally {
            setActionLoading(false);
        }
    }, []);

    return {
        createAlert: createAlertCommand.execute,
        acknowledgeAlert,
        resolveAlert,
        loading: createAlertCommand.loading || actionLoading,
        error: createAlertCommand.error || actionError,
    };
}
