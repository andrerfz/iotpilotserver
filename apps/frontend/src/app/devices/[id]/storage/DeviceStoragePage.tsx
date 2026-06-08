'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft, HardDrive, RefreshCw} from 'lucide-react';
import {Button, Card, CardBody, CardHeader} from '@/components/ui';
import {toast} from 'sonner';
import {useAuth} from '@/contexts/auth-context';

interface DeviceStoragePageProps {
    params: {id: string};
}

interface DeviceInfo {
    hostname: string;
    diskUsage: number | null;
    diskTotal: string | null;
    loadAverage: string | null;
    uptime: string | null;
    cpuUsage: number | null;
    memoryUsage: number | null;
    memoryTotal: number | null;
}

function UsageBar({value, label, color}: {value: number; label: string; color: string}) {
    const capped = Math.min(100, Math.max(0, value));
    const barColor = capped >= 90 ? 'bg-red-500' : capped >= 75 ? 'bg-yellow-500' : `bg-${color}-500`;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-default-600">{label}</span>
                <span className={`font-semibold ${capped >= 90 ? 'text-red-600' : capped >= 75 ? 'text-yellow-600' : ''}`}>
                    {capped.toFixed(1)}%
                </span>
            </div>
            <div className="w-full bg-default-200 rounded-full h-3 overflow-hidden">
                <div
                    className={`h-3 rounded-full transition-all ${barColor}`}
                    style={{width: `${capped}%`}}
                />
            </div>
        </div>
    );
}

function InfoRow({label, value}: {label: string; value: string | null}) {
    return (
        <div className="flex justify-between py-2 border-b border-default-100 last:border-0">
            <span className="text-default-500 text-sm">{label}</span>
            <span className="text-sm font-medium">{value || '—'}</span>
        </div>
    );
}

export default function DeviceStoragePage({params}: DeviceStoragePageProps) {
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
                hostname: d.hostname || d.name || 'Device',
                diskUsage: d.diskUsage ?? null,
                diskTotal: d.diskTotal ?? null,
                loadAverage: d.loadAverage ?? null,
                uptime: d.uptime ?? null,
                cpuUsage: d.cpuUsage ?? null,
                memoryUsage: d.memoryUsage ?? null,
                memoryTotal: d.memoryTotal ?? null,
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
                    <p className="text-default-500">Loading storage info...</p>
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
                            <HardDrive className="w-6 h-6" />
                            Storage — {info.hostname}
                        </h1>
                        <p className="text-default-500 text-sm">Disk, memory and system load</p>
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
                {/* Disk */}
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold">Disk Usage</h3>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        {info.diskUsage !== null ? (
                            <UsageBar value={info.diskUsage} label="Used" color="orange" />
                        ) : (
                            <p className="text-default-400 text-sm">No disk data available</p>
                        )}
                        <div className="divide-y divide-default-100">
                            <InfoRow label="Total capacity" value={info.diskTotal} />
                            {info.diskUsage !== null && info.diskTotal && (
                                <InfoRow
                                    label="Free (estimated)"
                                    value={`~${(100 - info.diskUsage).toFixed(1)}% of ${info.diskTotal}`}
                                />
                            )}
                        </div>
                    </CardBody>
                </Card>

                {/* Memory */}
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold">Memory Usage</h3>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        {info.memoryUsage !== null ? (
                            <UsageBar value={info.memoryUsage} label="Used" color="purple" />
                        ) : (
                            <p className="text-default-400 text-sm">No memory data available</p>
                        )}
                        <div className="divide-y divide-default-100">
                            <InfoRow
                                label="Total RAM"
                                value={info.memoryTotal ? `${(info.memoryTotal / 1024).toFixed(1)} GB` : null}
                            />
                        </div>
                    </CardBody>
                </Card>

                {/* System load */}
                <Card>
                    <CardHeader>
                        <h3 className="text-base font-semibold">System Load</h3>
                    </CardHeader>
                    <CardBody>
                        <div className="divide-y divide-default-100">
                            <InfoRow label="Load average" value={info.loadAverage} />
                            <InfoRow label="Uptime" value={info.uptime} />
                            {info.cpuUsage !== null && (
                                <div className="py-2">
                                    <UsageBar value={info.cpuUsage} label="CPU" color="blue" />
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
