'use client';

import Image from 'next/image';

interface AppLogoProps {
    size?: 'sm' | 'md' | 'lg';
    showSubtitle?: boolean;
}

export default function AppLogo({
    size = 'md',
    showSubtitle = true
}: AppLogoProps) {
    const iconSizes = {
        sm: {
            width: 32,
            height: 32
        },
        md: {
            width: 40,
            height: 40
        },
        lg: {
            width: 48,
            height: 48
        }
    };

    const titleSizes = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl'
    };

    return (
        <div className="flex items-center">
            <Image
                src="/logo.png"
                width={iconSizes[size].width}
                height={iconSizes[size].height}
                alt="IoT Pilot Logo"
                className="mr-3"
            />
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
