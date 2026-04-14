'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    className?: string;
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
    return (
        <div className={`text-center py-8 ${className ?? ''}`}>
            {icon && (
                <div className="flex justify-center mb-4">
                    {icon}
                </div>
            )}
            <p className="text-default-500">{title}</p>
            {description && (
                <p className="text-sm text-default-400">{description}</p>
            )}
        </div>
    );
}
