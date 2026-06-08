'use client';

import Image from 'next/image';
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
        sm: 32,
        md: 40,
        lg: 48
    };

    const titleSizes = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl'
    };

    return (
        <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
                <Image
                    src="/logo.png"
                    alt="IoT Pilot Logo"
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-auto h-16 object-contain"
                    priority
                    onError={(e) => {
                        // Fallback to Server icon if logo.png fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'block';
                    }}
                />
                <Server
                    className="w-16 h-16 text-primary-600 hidden"
                />
            </div>
            {showSubtitle && (
                <p className="text-sm text-default-500">Device Management</p>
            )}
        </div>
    );
}