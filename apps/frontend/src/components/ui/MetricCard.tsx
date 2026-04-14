'use client';

import { Card } from '@heroui/card';
import { ReactNode } from 'react';

interface MetricCardProps {
    label: string;
    value: ReactNode;
    icon: ReactNode;
    iconBg?: string;
    iconColor?: string;
    subtitle?: string;
    size?: 'sm' | 'lg';
    className?: string;
}

export function MetricCard({
    label,
    value,
    icon,
    iconBg = 'bg-gray-100',
    iconColor = 'text-gray-600',
    subtitle,
    size = 'sm',
    className,
}: MetricCardProps) {
    const isLg = size === 'lg';

    return (
        <Card className={`${isLg ? 'p-6 shadow-md' : 'p-4 shadow-sm'} ${className ?? ''}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <h3 className={`${isLg ? 'text-3xl' : 'text-2xl'} font-bold`}>{value}</h3>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
                <div className={`${iconBg} ${isLg ? 'p-3' : 'p-2'} rounded-full`}>
                    <span className={iconColor}>{icon}</span>
                </div>
            </div>
        </Card>
    );
}
