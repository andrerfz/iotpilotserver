import {useEffect, useState} from 'react';
import {useMonitoringQueries} from '@/hooks/queries/use-monitoring-queries';
import {AlertStats as AlertStatsType} from '@/lib/monitoring/infrastructure/dto/frontend-alert.types';

// import { toast } from 'react-toastify';

interface AlertStatsProps {
    stats: AlertStatsType;
}

/**
 * AlertStats component to display statistics about alerts.
 * @returns JSX element displaying alert statistics.
 */
export function AlertStats({ stats }: AlertStatsProps) {
    const { listAlerts, alertsData, loading, error } = useMonitoringQueries();
    const [activeCount, setActiveCount] = useState(0);
    const [acknowledgedCount, setAcknowledgedCount] = useState(0);
    const [resolvedCount, setResolvedCount] = useState(0);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                // Pass filter parameters directly - API route handles tenant context
                await listAlerts({
                    status: undefined, // Get all statuses
                    limit: 100,
                    offset: 0
                } as any);
            } catch (err) {
                // Error handling is managed by the hook
                console.error('Failed to fetch alerts:', err);
            }
        };
        fetchAlerts();
    }, [listAlerts]);

    useEffect(() => {
        if (alertsData) {
            setActiveCount(alertsData.filter(a => a.status as any === 'ACTIVE').length);
            setAcknowledgedCount(alertsData.filter(a => a.status as any === 'ACKNOWLEDGED').length);
            setResolvedCount(alertsData.filter(a => a.status as any === 'RESOLVED').length);
        }
    }, [alertsData]);

    if (loading) {
        return <div>Loading alert statistics...</div>;
    }

    if (error) {
        return <div>Error loading alert statistics: {error}</div>;
    }

    return (
        <div className="alert-stats">
            <h3>Alert Statistics</h3>
            <div className="stats-grid">
                <div className="stat-item">
                    <h4>Active</h4>
                    <p className="text-red-600 font-bold">{activeCount}</p>
                </div>
                <div className="stat-item">
                    <h4>Acknowledged</h4>
                    <p className="text-yellow-600 font-bold">{acknowledgedCount}</p>
                </div>
                <div className="stat-item">
                    <h4>Resolved</h4>
                    <p className="text-green-600 font-bold">{resolvedCount}</p>
                </div>
            </div>
        </div>
    );
}