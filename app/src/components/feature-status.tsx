'use client';

import {isDevelopment, isFeatureEnabled} from '@/lib/env';
import {Card, CardBody, CardHeader, Chip, Divider} from '@heroui/react';

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
        <Card>
            <CardHeader className="flex justify-between py-3">
                <span className="text-sm font-medium">Feature Status</span>
                <Chip size="sm" variant="flat" color="primary">
                    {enabledFeatures.length}/{Object.keys(features).length} enabled
                </Chip>
            </CardHeader>
            <Divider/>
            <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="w-full">
                        <span className="text-xs text-success font-medium mb-2 block">Enabled Features</span>
                        <div className="space-y-1">
                            {enabledFeatures.map(([feature]) => (
                                <div key={feature} className="flex items-center">
                                    <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
                                    <span className="text-xs text-default-700">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {disabledFeatures.length > 0 && (
                        <div className="w-full">
                            <span className="text-xs text-danger font-medium mb-2 block">Disabled Features</span>
                            <div className="space-y-1">
                                {disabledFeatures.map(([feature]) => (
                                    <div key={feature} className="flex items-center">
                                        <div className="w-2 h-2 bg-danger rounded-full mr-2"></div>
                                        <span className="text-xs text-default-500">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}
