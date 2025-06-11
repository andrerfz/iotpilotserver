'use client';

import { Server } from 'lucide-react';
import DeviceList from '@/components/device-list';
import UserMenu from '@/components/user-menu';
import ProtectedRoute from '@/components/protected-route';
import EnvironmentBanner from '@/components/environment-banner';
import MaintenanceBanner from '@/components/maintenance-banner';
import FeatureStatus from '@/components/feature-status';
import NetworkStatus from '@/components/network-status';
import { isDevelopment, getEnvironmentInfo, getBaseUrl } from '@/lib/env';

export default function Dashboard() {
    const envInfo = getEnvironmentInfo();

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                {/* Environment Banner */}
                <EnvironmentBanner/>

                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-6">
                            <div className="flex items-center">
                                <Server className="w-8 h-8 text-blue-600 mr-3"/>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                        IoT Pilot
                                        {isDevelopment() && (
                                            <span
                                                className="ml-2 text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded"> Development
                                            </span>
                                        )}
                                    </h1>
                                    <p className="text-sm text-gray-500">
                                        Device Management Dashboard
                                        {isDevelopment() && (
                                            <span className="ml-2">• {envInfo.features.length} features active</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <UserMenu/>
                        </div>
                    </div>
                </header>

                {/* Maintenance Banner */}
                <MaintenanceBanner/>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Development Info Panels */}
                    {isDevelopment() && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <FeatureStatus/>
                            <NetworkStatus/>
                        </div>
                    )}

                    {/* Main Device List */}
                    <DeviceList/>

                    {/* Footer with Environment Info */}
                    {isDevelopment() && (
                        <footer className="mt-8 pt-6 border-t border-gray-200">
                            <div className="text-center text-xs text-gray-500">
                                <p>
                                    Running in <strong>{envInfo.name}</strong> mode •
                                    Base URL: <code className="bg-gray-100 px-1 rounded">{getBaseUrl()}</code> •
                                    Features: {envInfo.features.join(', ') || 'None'}
                                </p>
                                {(envInfo.cloudflare || envInfo.tailscale) && (
                                    <p className="mt-1">
                                        Network:
                                        {envInfo.cloudflare && <span className="ml-1">CloudFlare ✓</span>}
                                        {envInfo.tailscale && <span className="ml-1">Tailscale ✓</span>}
                                    </p>
                                )}
                            </div>
                        </footer>
                    )}
                </main>
            </div>
        </ProtectedRoute>
    );
}