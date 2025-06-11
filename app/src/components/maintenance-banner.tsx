'use client';

import { AlertTriangle } from 'lucide-react';
import { isDevelopment } from '@/lib/env';

export default function MaintenanceBanner() {
    // This could be controlled by an environment variable or feature flag
    // For now, we'll show it in development as an example
    if (!isDevelopment()) return null;

    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-yellow-400"/>
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