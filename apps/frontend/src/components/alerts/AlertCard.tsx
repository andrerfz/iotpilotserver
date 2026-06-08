import { getSeverityCardClass } from '@/components/ui';

interface AlertCardData {
    id: string;
    title: string;
    message: string;
    severity: string;
    status: string;
    deviceId?: string;
    createdAt: Date | string;
}

interface AlertCardProps {
    alert: AlertCardData;
    onAcknowledge?: (id: string) => void;
    onResolve?: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge, onResolve }: AlertCardProps) {
    const severityClass = getSeverityCardClass(alert.severity);

    return (
        <div className={`alert-card p-4 rounded-lg shadow-md ${severityClass}`}>
            <h3 className="text-lg font-semibold">{alert.title}</h3>
            <p className="text-sm">{alert.message}</p>
            <p className="text-xs text-gray-600">Triggered: {new Date(alert.createdAt).toLocaleString()}</p>
            <p className="text-xs">Status: {alert.status}</p>
            {alert.deviceId && <p className="text-xs">Device ID: {alert.deviceId}</p>}
            <div className="mt-2 flex space-x-2">
                {alert.status === 'ACTIVE' && onAcknowledge && (
                    <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="text-xs bg-white text-black px-2 py-1 rounded hover:bg-gray-200"
                    >
                        Acknowledge
                    </button>
                )}
                {alert.status !== 'RESOLVED' && onResolve && (
                    <button
                        onClick={() => onResolve(alert.id)}
                        className="text-xs bg-white text-black px-2 py-1 rounded hover:bg-gray-200"
                    >
                        Resolve
                    </button>
                )}
            </div>
        </div>
    );
}
