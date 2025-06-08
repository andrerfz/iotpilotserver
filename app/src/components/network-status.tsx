'use client';

import {Globe, Network} from 'lucide-react';
import {getBaseUrl, getCloudFlareUrl, getTailscaleDomain, isDevelopment} from '@/lib/env';
import {Card, CardBody, CardHeader, Chip, Code, Divider} from '@heroui/react';

export default function NetworkStatus() {
    if (!isDevelopment()) return null;

    const cloudflareUrl = getCloudFlareUrl();
    const tailscaleDomain = getTailscaleDomain();
    const baseUrl = getBaseUrl();

    return (
        <Card>
            <CardHeader className="py-3">
                <span className="text-sm font-medium">Network Configuration</span>
            </CardHeader>
            <Divider/>
            <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-default-600">Base URL:</span>
                    <Code size="sm">{baseUrl}</Code>
                </div>

                {cloudflareUrl && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-default-600 flex items-center">
                            <Globe className="w-3 h-3 mr-1"/>
                            CloudFlare Tunnel:
                        </span>
                        <Code size="sm">{cloudflareUrl}</Code>
                    </div>
                )}

                {tailscaleDomain && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-default-600 flex items-center">
                            <Network className="w-3 h-3 mr-1"/>
                            Tailscale Domain:
                        </span>
                        <Code size="sm">{tailscaleDomain}</Code>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <span className="text-sm text-default-600">Environment:</span>
                    <Chip
                        size="sm"
                        variant="flat"
                        color={isDevelopment() ? "primary" : "success"}
                    >
                        {isDevelopment() ? 'Development' : 'Production'}
                    </Chip>
                </div>
            </CardBody>
        </Card>
    );
}
