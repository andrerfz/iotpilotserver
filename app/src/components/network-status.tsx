'use client';

import { Globe, Network } from 'lucide-react';
import { 
    isDevelopment, 
    getCloudFlareUrl, 
    getTailscaleDomain, 
    getBaseUrl 
} from '@/lib/env';

export default function NetworkStatus() {
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
                            <Globe className="w-3 h-3 mr-1"/>
                            CloudFlare Tunnel:
                        </span>
                        <span className="font-mono text-xs text-gray-900">{cloudflareUrl}</span>
                    </div>
                )}

                {tailscaleDomain && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center">
                            <Network className="w-3 h-3 mr-1"/>
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