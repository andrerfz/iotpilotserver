import { Server, AlertTriangle, Wrench, Globe, Network } from 'lucide-react';
import DeviceList from '@/components/device-list';
import UserMenu from '@/components/user-menu';
import ProtectedRoute from '@/components/protected-route';
import {
    isDevelopment,
    isProduction,
    getEnvironmentInfo,
    getCloudFlareUrl,
    getTailscaleDomain,
    isFeatureEnabled,
    getBaseUrl
} from '@/lib/env';

function EnvironmentBanner() {
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
                            <Wrench className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">
                Development Environment
              </span>
                        </div>

                        <div className="hidden md:flex items-center space-x-4 text-xs">
                            <div className="flex items-center">
                                <Globe className="w-3 h-3 mr-1" />
                                <span>CF: {hasCloudFlare ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="flex items-center">
                                <Network className="w-3 h-3 mr-1" />
                                <span>TS: {hasTailscale ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div>
                                Features: {envInfo.features.length}
                            </div>
                        </div>
                    </div>

                    <div className="text-xs font-mono bg-blue-700 px-2 py-1 rounded">
                        {getBaseUrl()}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MaintenanceBanner() {
    // This could be controlled by an environment variable or feature flag
    // For now, we'll show it in development as an example
    if (!isDevelopment()) return null;

    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            <strong>Development Mode:</strong> Some features may behave differently than in production.
                            Real device connections and external services are active.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureStatus() {
    if (!isDevelopment()) return null;

    const features = {
        'SSH Terminal': isFeatureEnabled('sshTerminal'),
        'Tailscale Integration': isFeatureEnabled('tailscaleIntegration'),
        'Device Commands': isFeatureEnabled('deviceCommands'),
        'Real-time Updates': isFeatureEnabled('realTimeUpdates'),
        'Advanced Metrics': isFeatureEnabled('advancedMetrics'),
    };

    const enabledFeatures = Object.entries(features).filter(([, enabled]) => enabled);
    const disabledFeatures = Object.entries(features).filter(([, enabled]) => !enabled);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Feature Status</h3>
                <span className="text-xs text-gray-500">
          {enabledFeatures.length}/{Object.keys(features).length} enabled
        </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-xs font-medium text-green-700 mb-2">Enabled Features</h4>
                    <div className="space-y-1">
                        {enabledFeatures.map(([feature]) => (
                            <div key={feature} className="flex items-center text-xs">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {disabledFeatures.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-red-700 mb-2">Disabled Features</h4>
                        <div className="space-y-1">
                            {disabledFeatures.map(([feature]) => (
                                <div key={feature} className="flex items-center text-xs">
                                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                    <span className="text-gray-500">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function NetworkStatus() {
    if (!isDevelopment()) return null;

    const cloudflareUrl = getCloudFlareUrl();
    const tailscaleDomain = getTailscaleDomain();
    const baseUrl = getBaseUrl();

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Network Configuration</h3>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Base URL:</span>
                    <span className="font-mono text-xs text-gray-900">{baseUrl}</span>
                </div>

                {cloudflareUrl && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center">
              <Globe className="w-3 h-3 mr-1" />
              CloudFlare Tunnel:
            </span>
                        <span className="font-mono text-xs text-gray-900">{cloudflareUrl}</span>
                    </div>
                )}

                {tailscaleDomain && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center">
              <Network className="w-3 h-3 mr-1" />
              Tailscale Domain:
            </span>
                        <span className="font-mono text-xs text-gray-900">{tailscaleDomain}</span>
                    </div>
                )}

                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Environment:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isDevelopment()
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                    }`}>
            {isDevelopment() ? 'Development' : 'Production'}
          </span>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const envInfo = getEnvironmentInfo();

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                {/* Environment Banner */}
                <EnvironmentBanner />

                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-6">
                            <div className="flex items-center">
                                <Server className="w-8 h-8 text-blue-600 mr-3" />
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                        IoT Pilot
                                        {isDevelopment() && (
                                            <span className="ml-2 text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Development
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
                            <UserMenu />
                        </div>
                    </div>
                </header>

                {/* Maintenance Banner */}
                <MaintenanceBanner />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Development Info Panels */}
                    {isDevelopment() && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <FeatureStatus />
                            <NetworkStatus />
                        </div>
                    )}

                    {/* Main Device List */}
                    <DeviceList />

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