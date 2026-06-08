'use client';

interface SeverityBadgeProps {
    severity: string;
    className?: string;
}

const SEVERITY_CLASSES: Record<string, string> = {
    INFO: 'bg-blue-100 text-blue-800 border-blue-200',
    WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ERROR: 'bg-red-100 text-red-800 border-red-200',
    CRITICAL: 'bg-red-700 text-white border-red-800',
};

const DEFAULT_CLASS = 'bg-gray-100 text-gray-800 border-gray-200';

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
    const classes = SEVERITY_CLASSES[severity] ?? DEFAULT_CLASS;

    return (
        <span className={`text-xs px-2 py-1 rounded-full border ${classes} ${className ?? ''}`}>
            {severity}
        </span>
    );
}

export function getSeverityCardClass(severity: string): string {
    switch (severity) {
        case 'CRITICAL': return 'bg-red-100 text-red-800';
        case 'WARNING': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-blue-100 text-blue-800';
    }
}
