'use client';

import {useEffect, useState} from 'react';
import {useDeviceQueries} from '@/hooks/queries/use-device-queries';

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
    const { listDevices, loading, error } = useDeviceQueries();
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
                if (response && (response as any).devices) {
                    setDevices((response as any).devices);
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

    return (
        <div className="device-list p-4">
            <h2 className="text-2xl font-bold mb-4">Devices</h2>
            <ul className="space-y-2">
                {devices.map(device => (
                    <li key={device.id} className="border p-3 rounded">
                        <div className="font-semibold">{device.hostname}</div>
                        <div className="text-sm text-gray-600">
                            {device.deviceType} - Status: {device.status}
                        </div>
                        {device.ipAddress && (
                            <div className="text-sm text-gray-500">IP: {device.ipAddress}</div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default DeviceList;