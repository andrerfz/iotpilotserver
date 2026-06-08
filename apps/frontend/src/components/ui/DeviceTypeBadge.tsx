'use client';

interface DeviceTypeBadgeProps {
    type: string;
    className?: string;
}

export function DeviceTypeBadge({ type, className }: DeviceTypeBadgeProps) {
    return (
        <span className={`bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs ${className ?? ''}`}>
            {type.replace('_', ' ')}
        </span>
    );
}
