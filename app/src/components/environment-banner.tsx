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
import { Navbar, NavbarContent, Chip, Badge } from '@heroui/react';

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
        <Navbar className="bg-gradient-to-r from-primary-500 to-primary-600 text-white py-0 min-h-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <NavbarContent className="py-1 flex justify-between overflow-visible">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center">
                            <Wrench className="w-4 h-4 mr-2"/>
                            <span className="text-sm font-medium">Development Environment</span>
                        </div>

                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center">
                                <Globe className="w-3 h-3 mr-1"/>
                                <span className="text-xs">CF: {hasCloudFlare ? 
                                    <Badge color="success" variant="flat" size="sm">Active</Badge> : 
                                    <Badge color="default" variant="flat" size="sm">Inactive</Badge>}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <Network className="w-3 h-3 mr-1"/>
                                <span className="text-xs">TS: {hasTailscale ? 
                                    <Badge color="success" variant="flat" size="sm">Active</Badge> : 
                                    <Badge color="default" variant="flat" size="sm">Inactive</Badge>}
                                </span>
                            </div>
                            <span className="text-xs">
                                Features: {envInfo.features.length}
                            </span>
                        </div>
                    </div>

                    <Chip size="sm" variant="solid" color="primary" className="bg-primary-700">
                        <code>{mounted ? window.location.origin : getBaseUrl()}</code>
                    </Chip>
                </NavbarContent>
            </div>
        </Navbar>
    );
}
