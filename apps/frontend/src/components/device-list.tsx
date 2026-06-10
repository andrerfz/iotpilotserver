'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useDeviceQueries} from '@/hooks/queries/use-device-queries';
import {Plus} from 'lucide-react';
import {Button} from '@/components/ui';
import {useUserPreferences} from '@/contexts/user-preferences-context';

/**
 * Device interface matching API response
 */
interface Device {
    id: string;
    deviceId: string;
    hostname: string;
    deviceType: string;
    ipAddress?: string;
    status: string;
    lastSeen?: Date;
    cpuUsage?: number;
    memoryUsage?: number;
}

/**
 * DeviceList component to display a list of devices using domain queries.
 * @returns JSX element displaying the list of devices.
 */
export function DeviceList() {
    const router = useRouter();
    const { listDevices, loading, error } = useDeviceQueries();
    const {preferences} = useUserPreferences();
    const layout = preferences.dashboardLayout;
    const [devices, setDevices] = useState<Device[]>([]);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                // Pass filter parameters directly - API route handles tenant context
                const response = await listDevices({
                    status: 'all',
                    limit: 100,
                    offset: 0,
                    sortBy: 'hostname',
                    sortDirection: 'asc'
                } as any);
                
                // Extract devices from response
                if (response) {
                    if (Array.isArray(response)) {
                        setDevices(response as any);
                    } else if ((response as any).devices) {
                        setDevices((response as any).devices);
                    }
                }
            } catch (err) {
                // Error handling is managed by the hook
                console.error('Failed to fetch devices:', err);
            }
        };
        fetchDevices();
    }, [listDevices]);

    if (loading) {
        return <div className="p-4">Loading devices...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-500">Error loading devices: {error}</div>;
    }

    if (devices.length === 0) {
        return <div className="p-4">No devices found.</div>;
    }

    const listClass = layout === 'compact' ? 'space-y-1' : layout === 'expanded' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-2';
    const itemClass = layout === 'compact' ? 'block border p-2 rounded text-sm hover:bg-gray-50 hover:border-blue-300 transition-colors cursor-pointer' : 'block border p-3 rounded hover:bg-gray-50 hover:border-blue-300 transition-colors cursor-pointer';

    return (
        <div className="device-list p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Devices</h2>
                <Button
                    onClick={() => router.push('/devices/add')}
                    color="primary"
                    size="sm"
                    startContent={<Plus className="w-4 h-4"/>}
                >
                    Add Device
                </Button>
            </div>
            <ul className={listClass}>
                {devices.map(device => (
                    <li key={device.id}>
                        <Link href={`/devices/${device.id}`} className={itemClass}>
                            <div className={layout === 'compact' ? 'font-medium' : 'font-semibold'}>{device.hostname}</div>
                            <div className="text-sm text-gray-600">
                                {device.deviceType} - Status: {device.status}
                            </div>
                            {device.ipAddress && layout !== 'compact' && (
                                <div className="text-sm text-gray-500">IP: {device.ipAddress}</div>
                            )}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default DeviceList;