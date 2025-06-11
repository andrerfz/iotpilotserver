'use client';

import DeviceDetailPage from '@/components/device-page';

// This file has been refactored to use the DeviceDetailPage component from @/components/device-page.tsx
// The original code has been moved to that file

export default function DevicePageRoute({ params }: { params: { id: string } }) {
    return <DeviceDetailPage params={params} />;
}