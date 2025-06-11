'use client';

import { useState, useEffect } from 'react';
import { Wrench, Globe, Network } from 'lucide-react';
import {
    isDevelopment,
    isProduction,
    getEnvironmentInfo,
    getCloudFlareUrl,
    getTailscaleDomain,
    getBaseUrl
} from '@/lib/env';

export default function EnvironmentBanner() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (isProduction()) return null;

    const envInfo = getEnvironmentInfo();
    const hasCloudFlare = !!getCloudFlareUrl();
    const hasTailscale = !!getTailscaleDomain();

    return (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <Wrench className="w-4 h-4 mr-2"/>
                            <span className="text-sm font-medium"> Development Environment </span>
                        </div>

                        <div className="hidden md:flex items-center space-x-4 text-xs">
                            <div className="flex items-center">
                                <Globe className="w-3 h-3 mr-1"/>
                                <span>CF: {hasCloudFlare ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="flex items-center">
                                <Network className="w-3 h-3 mr-1"/>
                                <span>TS: {hasTailscale ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div>
                                Features: {envInfo.features.length}
                            </div>
                        </div>
                    </div>

                    <div className="text-xs font-mono bg-blue-700 px-2 py-1 rounded">
                        {mounted ? window.location.origin : getBaseUrl()}
                    </div>
                </div>
            </div>
        </div>
    );
}