import {useQuery} from './use-query';
import {GetDeviceQuery} from '@/lib/device/application/queries/get-device/get-device.query';
import {ListDevicesQuery} from '@/lib/device/application/queries/list-devices/list-devices.query';

// Simplified device interface for API responses
interface DeviceData {
    id: string;
    hostname: string;
    ipAddress: string;
    status: string;
    deviceType: string;
    customerId: string;
    [key: string]: any; // Allow additional properties
}

/**
 * A hook for executing device-specific queries via API calls.
 * @returns Functions to execute device queries with loading, error, and data states.
 */
export function useDeviceQueries() {
    const getDeviceQuery = useQuery<GetDeviceQuery, DeviceData>('/api/devices');
    const listDevicesQuery = useQuery<ListDevicesQuery, DeviceData[]>('/api/devices');

    return {
        getDevice: getDeviceQuery.execute,
        listDevices: listDevicesQuery.execute,
        getDeviceData: getDeviceQuery.data,
        listDevicesData: listDevicesQuery.data,
        loading: getDeviceQuery.loading || listDevicesQuery.loading,
        error: getDeviceQuery.error || listDevicesQuery.error
    };
}

