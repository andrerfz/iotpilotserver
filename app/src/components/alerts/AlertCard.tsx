import React from 'react';
import {
    Card,
    CardBody,
    Chip,
    Button,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem
} from '@heroui/react';
import {
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    MoreVertical,
    Eye,
    MessageSquare,
    UserCheck
} from 'lucide-react';

interface Alert {
    id: string;
    deviceId: string;
    type: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    title: string;
    message: string;
    resolved: boolean;
    resolvedAt?: string;
    acknowledgedAt?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}

interface AlertCardProps {
    alert: Alert;
    onView?: (alert: Alert) => void;
    onAcknowledge?: (alertId: string) => void;
    onResolve?: (alertId: string) => void;
    onComment?: (alertId: string) => void;
    compact?: boolean;
}

const SEVERITY_CONFIG = {
    INFO: {
        color: 'primary' as const,
        icon: Clock,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700'
    },
    WARNING: {
        color: 'warning' as const,
        icon: AlertTriangle,
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700'
    },
    ERROR: {
        color: 'danger' as const,
        icon: XCircle,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700'
    },
    CRITICAL: {
        color: 'danger' as const,
        icon: XCircle,
        bgColor: 'bg-red-100',
        textColor: 'text-red-800'
    }
};

export function AlertCard({
    alert,
    onView,
    onAcknowledge,
    onResolve,
    onComment,
    compact = false
}: AlertCardProps) {
    const severityConfig = SEVERITY_CONFIG[alert.severity];
    const IconComponent = severityConfig.icon;

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        if (diffMinutes > 0) return `${diffMinutes}m ago`;
        return 'Just now';
    };

    return (
        <Card
            className={`w-full hover:shadow-md transition-shadow ${
                alert.severity === 'CRITICAL' && !alert.resolved ? 'ring-2 ring-red-500' : ''
            }`}
        >
            <CardBody className={compact ? 'p-4' : 'p-6'}>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        {/* Severity Icon */}
                        <div className={`p-2 rounded-full ${severityConfig.bgColor}`}>
                            <IconComponent className={`w-4 h-4 ${severityConfig.textColor}`}/>
                        </div>

                        {/* Alert Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold text-foreground truncate">
                                    {alert.title}
                                </h4>
                                <Chip
                                    color={severityConfig.color}
                                    variant="flat"
                                    size="sm"
                                >
                                    {alert.severity}
                                </Chip>
                                {alert.resolved ? (
                                    <Chip color="success" variant="flat" size="sm">
                                        Resolved
                                    </Chip>
                                ) : alert.acknowledgedAt ? (
                                    <Chip color="warning" variant="flat" size="sm">
                                        Acknowledged
                                    </Chip>
                                ) : (
                                    <Chip color="danger" variant="flat" size="sm">
                                        Active
                                    </Chip>
                                )}
                            </div>

                            <p className="text-sm text-default-600 mb-2 line-clamp-2">
                                {alert.message}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-default-500">
                                <span>{formatTimeAgo(alert.createdAt)}</span>
                                <span className="capitalize">
                                    {alert.type.toLowerCase().replace('_', ' ')}
                                </span>
                                {alert.metadata?.threshold && (
                                    <span>
                                        Threshold: {alert.metadata.threshold}%
                                    </span>
                                )}
                                {alert.resolvedAt && (
                                    <span>
                                        Resolved {formatTimeAgo(alert.resolvedAt)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {!compact && (
                            <>
                                <Button
                                    size="sm"
                                    variant="light"
                                    startContent={<Eye className="w-4 h-4"/>}
                                    onClick={() => onView?.(alert)}
                                >
                                    View
                                </Button>

                                {!alert.resolved && (
                                    <>
                                        {!alert.acknowledgedAt && onAcknowledge && (
                                            <Button
                                                size="sm"
                                                variant="bordered"
                                                color="warning"
                                                startContent={<UserCheck className="w-4 h-4"/>}
                                                onClick={() => onAcknowledge(alert.id)}
                                            >
                                                Acknowledge
                                            </Button>
                                        )}

                                        {onResolve && (
                                            <Button
                                                size="sm"
                                                color="success"
                                                variant="bordered"
                                                startContent={<CheckCircle className="w-4 h-4"/>}
                                                onClick={() => onResolve(alert.id)}
                                            >
                                                Resolve
                                            </Button>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        <DropdownMenu>
                            {(() => {
                                type MenuItem = {
                                    key: string;
                                    startContent: React.ReactNode;
                                    onClick: () => void;
                                    label: string;
                                    className?: string;
                                };

                                const items: MenuItem[] = [
                                    {
                                        key: "view",
                                        startContent: <Eye className="w-4 h-4"/>,
                                        onClick: () => onView?.(alert),
                                        label: "View Details"
                                    }
                                ];

                                if (onComment) {
                                    items.push({
                                        key: "comment",
                                        startContent: <MessageSquare className="w-4 h-4"/>,
                                        onClick: () => onComment(alert.id),
                                        label: "Add Comment"
                                    });
                                }

                                if (!alert.resolved && !alert.acknowledgedAt && onAcknowledge) {
                                    items.push({
                                        key: "acknowledge",
                                        startContent: <UserCheck className="w-4 h-4"/>,
                                        onClick: () => onAcknowledge(alert.id),
                                        label: "Acknowledge"
                                    });
                                }

                                if (!alert.resolved && onResolve) {
                                    items.push({
                                        key: "resolve",
                                        startContent: <CheckCircle className="w-4 h-4"/>,
                                        onClick: () => onResolve(alert.id),
                                        label: "Resolve Alert",
                                        className: "text-success"
                                    });
                                }

                                return items.map(item => (
                                    <DropdownItem
                                        key={item.key}
                                        startContent={item.startContent}
                                        onClick={item.onClick}
                                        className={item.className}
                                    >
                                        {item.label}
                                    </DropdownItem>
                                ));
                            })()}
                        </DropdownMenu>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}