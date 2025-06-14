'use client';

import {isDevelopment} from '@/lib/env';
import {Alert} from '@heroui/react';

export default function MaintenanceBanner() {
    // This could be controlled by an environment variable or feature flag
    // For now, we'll show it in development as an example
    if (!isDevelopment()) return null;

    return (
        <Alert
            variant="bordered"
            color="warning"
            startContent={''}
            className="border-l-4 rounded-none"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <p className="text-sm">
                    <strong>Development Mode:</strong> Some features may behave differently than in production.
                    Real device connections and external services are active.
                </p>
            </div>
        </Alert>
    );
}
