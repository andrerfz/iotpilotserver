'use client';

import { isDevelopment, isFeatureEnabled } from '@/lib/env';

export default function FeatureStatus() {
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