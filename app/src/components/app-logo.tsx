'use client';

import { Server } from 'lucide-react';

interface AppLogoProps {
    size?: 'sm' | 'md' | 'lg';
    showSubtitle?: boolean;
}

export default function AppLogo({ 
    size = 'md',
    showSubtitle = true 
}: AppLogoProps) {
    const iconSizes = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12'
    };

    const titleSizes = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl'
    };

    return (
        <div className="flex items-center">
            <Server className={`${iconSizes[size]} text-primary-600 mr-3`} />
            <div>
                <h1 className={`${titleSizes[size]} font-bold text-foreground`}>
                    IoT Pilot
                </h1>
                {showSubtitle && (
                    <p className="text-sm text-default-500">Device Management</p>
                )}
            </div>
        </div>
    );
}
