'use client';

import { Chip } from '@heroui/react';
import {
    Wifi, WifiOff, Clock, AlertTriangle,
    CheckCircle, XCircle, Wrench,
    Loader2, AlertCircle,
} from 'lucide-react';
import { ReactNode } from 'react';

type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR' | 'UNCLAIMED' | 'PENDING_SETUP';
type CommandStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

type StatusType = DeviceStatus | CommandStatus;

interface StatusBadgeProps {
    status: string;
    variant?: 'chip' | 'flat' | 'dot';
    size?: 'sm' | 'md';
    className?: string;
}

const DEVICE_STATUS_CONFIG: Record<DeviceStatus, { color: 'success' | 'danger' | 'warning' | 'default'; icon: ReactNode; label?: string }> = {
    ONLINE: { color: 'success', icon: <Wifi className="w-4 h-4" /> },
    OFFLINE: { color: 'danger', icon: <WifiOff className="w-4 h-4" /> },
    MAINTENANCE: { color: 'warning', icon: <Wrench className="w-4 h-4" /> },
    ERROR: { color: 'danger', icon: <AlertTriangle className="w-4 h-4" /> },
    UNCLAIMED: { color: 'default', icon: <WifiOff className="w-4 h-4" /> },
    PENDING_SETUP: { color: 'warning', icon: <Clock className="w-4 h-4" /> },
};

const COMMAND_STATUS_CONFIG: Record<CommandStatus, { color: 'success' | 'danger' | 'warning' | 'default' | 'primary'; icon: ReactNode }> = {
    PENDING: { color: 'default', icon: <Clock className="w-4 h-4" /> },
    RUNNING: { color: 'primary', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    COMPLETED: { color: 'success', icon: <CheckCircle className="w-4 h-4" /> },
    FAILED: { color: 'danger', icon: <XCircle className="w-4 h-4" /> },
    TIMEOUT: { color: 'warning', icon: <AlertCircle className="w-4 h-4" /> },
};

function getConfig(status: string) {
    if (status in DEVICE_STATUS_CONFIG) return DEVICE_STATUS_CONFIG[status as DeviceStatus];
    if (status in COMMAND_STATUS_CONFIG) return COMMAND_STATUS_CONFIG[status as CommandStatus];
    return { color: 'default' as const, icon: <WifiOff className="w-4 h-4" /> };
}

export function StatusBadge({ status, variant = 'chip', size = 'sm', className }: StatusBadgeProps) {
    const config = getConfig(status);

    if (variant === 'dot') {
        return (
            <Chip
                size={size}
                color={config.color}
                variant="flat"
                className={className}
            >
                {status}
            </Chip>
        );
    }

    return (
        <Chip
            size={size}
            color={config.color}
            variant={variant === 'flat' ? 'flat' : 'bordered'}
            startContent={config.icon}
            className={className}
        >
            {status}
        </Chip>
    );
}

export function getStatusChipColor(status: string): 'success' | 'danger' | 'warning' | 'default' | 'primary' {
    return getConfig(status).color;
}

export function getStatusIcon(status: string): ReactNode {
    return getConfig(status).icon;
}
