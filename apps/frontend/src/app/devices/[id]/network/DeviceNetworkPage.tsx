'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft, Network, RefreshCw, Wifi} from 'lucide-react';
import {Button, Card, CardBody, CardHeader, Chip} from '@/components/ui';
import {toast} from 'sonner';
import {useAuth} from '@/contexts/auth-context';

interface DeviceNetworkPageProps {
    params: {id: string};
}

interface DeviceInfo {
    hostname: string;
    ipAddress: string | null;
    tailscaleIp: string | null;
    macAddress: string | null;
    location: string | null;
    connectionQuality: string | null;
    isOnline: boolean;
    lastSeen: string | null;
    agentVersion: string | null;
    architecture: string | null;
    deviceType: string | null;
}

function InfoRow({label, value, mono = false}: {label: string; value: string | null; mono?: boolean}) {
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-default-100 last:border-0">
            <span className="text-default-500 text-sm">{label}</span>
            <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
        </div>
    );
}

function QualityChip({quality}: {quality: string | null}) {
    if (!quality) return <span className="text-sm text-default-400">—</span>;
    const map: Record<string, {color: 'success' | 'warning' | 'danger' | 'default'; label: string}> = {
        good:         {color: 'success', label: 'Good'},
        fair:         {color: 'warning', label: 'Fair'},
        poor:         {color: 'danger',  label: 'Poor'},
        disconnected: {color: 'default', label: 'Disconnected'},
    };
    const cfg = map[quality] ?? {color: 'default', label: quality};
    return <Chip color={cfg.color} size="sm" variant="flat">{cfg.label}</Chip>;
}

export default function DeviceNetworkPage({params}: DeviceNetworkPageProps) {
    const router = useRouter();
    const {apiCall} = useAuth();
    const [info, setInfo] = useState<DeviceInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDevice = useCallback(async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const res = await apiCall(`/api/devices/${params.id}`);
            if (!res.ok) throw new Error('Failed to fetch device');
            const result = await res.json();
            const d = result.data ?? result;
            setInfo({
                hostname:         d.hostname || d.name || 'Device',
                ipAddress:        d.ipAddress ?? null,
                tailscaleIp:      d.tailscaleIp ?? null,
                macAddress:       d.macAddress ?? null,
                location:         d.location ?? null,
                connectionQuality: d.connectionQuality ?? null,
                isOnline:         !!d.isOnline,
                lastSeen:         d.lastSeen ? new Date(d.lastSeen).toLocaleString() : null,
                agentVersion:     d.agentVersion ?? null,
                architecture:     d.architecture ?? null,
                deviceType:       d.deviceType ?? null,
            });
        } catch {
            toast.error('Failed to load device information');
            router.push(`/devices/${params.id}`);
        } finally {
            setRefreshing(false);
        }
    }, [apiCall, params.id, router]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchDevice();
            setLoading(false);
        })();
    }, [fetchDevice]);

    if (loading || !info) {
        return (
            <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-default-500">Loading network info...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => router.push(`/devices/${params.id}`)}
                        variant="light"
                        size="sm"
                        startContent={<ArrowLeft className="w-4 h-4" />}
                    >
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Network className="w-6 h-6" />
                            Network — {info.hostname}
                        </h1>
                        <p className="text-default-500 text-sm">Connectivity and network configuration</p>
                    </div>
                </div>
                <Button
                    variant="bordered"
                    size="sm"
                    startContent={<RefreshCw className="w-4 h-4" />}
                    isLoading={refreshing}
                    onClick={() => fetchDevice(true)}
                >
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Connectivity */}
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            <Wifi className="w-4 h-4" />
                            Connectivity
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <div>
                            <div className="flex justify-between items-center py-2.5 border-b border-default-100">
                                <span className="text-default-500 text-sm">Status</span>
                                <Chip
                                    color={info.isOnline ? 'success' : 'danger'}
                                    size="sm"
                                    variant="flat"
                                >
                                    {info.isOnline ? 'Online' : 'Offline'}
                                </Chip>
                            </div>
                            <div className="flex justify-between items-center py-2.5 border-b border-default-100">
                                <span className="text-default-500 text-sm">Connection quality</span>
                                <QualityChip quality={info.connectionQuality} />
                            </div>
                            <InfoRow label="Last seen" value={info.lastSeen} />
                        </div>
                    </CardBody>
                </Card>

                {/* Addresses */}
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold">IP Addresses</h3>
                    </CardHeader>
                    <CardBody>
                        <InfoRow label="Primary IP" value={info.ipAddress} mono />
                        <InfoRow label="Tailscale IP" value={info.tailscaleIp} mono />
                        <InfoRow label="MAC address" value={info.macAddress} mono />
                        <InfoRow label="Hostname" value={info.hostname} mono />
                    </CardBody>
                </Card>

                {/* Device identity */}
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold">Device Identity</h3>
                    </CardHeader>
                    <CardBody>
                        <InfoRow label="Device type" value={info.deviceType} />
                        <InfoRow label="Architecture" value={info.architecture} />
                        <InfoRow label="Agent version" value={info.agentVersion} />
                        <InfoRow label="Location" value={info.location} />
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
