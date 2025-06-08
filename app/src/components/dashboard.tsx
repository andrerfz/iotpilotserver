'use client';

import {Server} from 'lucide-react';
import DeviceList from '@/components/device-list';
import UserMenu from '@/components/user-menu';
import ProtectedRoute from '@/components/protected-route';
import MaintenanceBanner from '@/components/maintenance-banner';
import FeatureStatus from '@/components/feature-status';
import NetworkStatus from '@/components/network-status';
import {getBaseUrl, getEnvironmentInfo, isDevelopment} from '@/lib/env';
import {Chip, Code, Divider, Navbar, NavbarBrand} from '@heroui/react';

export default function Dashboard() {
    const envInfo = getEnvironmentInfo();

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-default-50">

                <Navbar
                    className="border-b border-divider bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-1"
                    maxWidth="full"
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
                        <NavbarBrand>
                            <div className="flex items-center gap-3">
                                <Server className="w-8 h-8 text-primary-600"/>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-bold">IoT Pilot</h1>
                                        {isDevelopment() && (
                                            <Chip color="primary" variant="flat" size="sm">
                                                Development
                                            </Chip>
                                        )}
                                    </div>
                                    <p className="text-sm text-default-500">
                                        Device Management Dashboard
                                        {isDevelopment() && (
                                            <span className="ml-2">• {envInfo.features.length} features active</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </NavbarBrand>

                        <UserMenu/>
                    </div>
                </Navbar>

                {/* Maintenance Banner */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <MaintenanceBanner/>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Development Info Panels */}
                    {isDevelopment() && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <FeatureStatus/>
                            <NetworkStatus/>
                        </div>
                    )}

                    {/* Main Device List */}
                    <DeviceList/>
                </div>

                {/* Footer with Environment Info */}
                {isDevelopment() && (
                    <footer>
                        <Divider/>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <div className="text-center">
                                <p className="text-xs text-default-500">
                                    Running in <strong>{envInfo.name}</strong> mode •
                                    Base URL: <Code>{getBaseUrl()}</Code> •
                                    Features: {envInfo.features.join(', ') || 'None'}
                                </p>
                                {(envInfo.cloudflare || envInfo.tailscale) && (
                                    <p className="text-xs text-default-500 mt-1">
                                        Network:
                                        {envInfo.cloudflare && <span className="ml-1">CloudFlare ✓</span>}
                                        {envInfo.tailscale && <span className="ml-1">Tailscale ✓</span>}
                                    </p>
                                )}
                            </div>
                        </div>
                    </footer>
                )}
            </div>
        </ProtectedRoute>
    );
}
