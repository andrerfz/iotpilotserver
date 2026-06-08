import {useCallback, useState} from 'react';
import {useQuery} from './use-query';
import { apiUrl } from '@/utils/api-url';

interface DeviceListParams {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    [key: string]: unknown;
}

interface DeviceData {
    id: string;
    hostname: string;
    ipAddress: string;
    status: string;
    deviceType: string;
    customerId: string;
    [key: string]: unknown;
}

export function useDeviceQueries() {
    const listDevicesQuery = useQuery<DeviceListParams, DeviceData[]>('/api/devices');

    const [deviceDetail, setDeviceDetail] = useState<DeviceData | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    // GET /api/devices/{publicId}
    const getDevice = useCallback(async (publicId: string): Promise<DeviceData | null> => {
        setDetailLoading(true);
        setDetailError(null);
        try {
            const res = await fetch(apiUrl(`/api/devices/${publicId}`), {credentials: 'include'});
            if (!res.ok) throw new Error(`Failed to fetch device: ${res.status}`);
            const body = await res.json();
            const data = (body.data ?? body) as DeviceData;
            setDeviceDetail(data);
            return data;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to fetch device';
            setDetailError(msg);
            return null;
        } finally {
            setDetailLoading(false);
        }
    }, []);

    return {
        getDevice,
        listDevices: listDevicesQuery.execute,
        getDeviceData: deviceDetail,
        listDevicesData: listDevicesQuery.data,
        loading: detailLoading || listDevicesQuery.loading,
        error: detailError || listDevicesQuery.error,
    };
}
