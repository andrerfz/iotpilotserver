import {AlertEntity} from '@/lib/monitoring/domain/entities/alert.entity';

interface AlertCardProps {
    alert: AlertEntity;
    onAcknowledge?: (id: string) => void;
    onResolve?: (id: string) => void;
}

/**
 * AlertCard component to display individual alert information.
 * @param props The component props including the alert data and optional action handlers.
 * @returns JSX element displaying the alert details.
 */
export function AlertCard({ alert, onAcknowledge, onResolve }: AlertCardProps) {
    const severityClass = alert.severity as any === 'CRITICAL' ? 'bg-red-100 text-red-800' : 
                         alert.severity as any === 'WARNING' ? 'bg-yellow-100 text-yellow-800' : 
                         'bg-blue-100 text-blue-800';

    return (
        <div className={`alert-card p-4 rounded-lg shadow-md ${severityClass}`}>
            <h3 className="text-lg font-semibold">{alert.title}</h3>
            <p className="text-sm">{alert.message}</p>
            <p className="text-xs text-gray-600">Triggered: {new Date(alert.createdAt).toLocaleString()}</p>
            <p className="text-xs">Status: {alert.status as any}</p>
            {alert.deviceId && <p className="text-xs">Device ID: {alert.deviceId as any}</p>}
            <div className="mt-2 flex space-x-2">
                {alert.status as any === 'ACTIVE' && onAcknowledge && (
                    <button 
                        onClick={() => onAcknowledge(alert.id as any)} 
                        className="text-xs bg-white text-black px-2 py-1 rounded hover:bg-gray-200"
                    >
                        Acknowledge
                    </button>
                )}
                {alert.status as any !== 'RESOLVED' && onResolve && (
                    <button 
                        onClick={() => onResolve(alert.id as any)} 
                        className="text-xs bg-white text-black px-2 py-1 rounded hover:bg-gray-200"
                    >
                        Resolve
                    </button>
                )}
            </div>
        </div>
    );
}