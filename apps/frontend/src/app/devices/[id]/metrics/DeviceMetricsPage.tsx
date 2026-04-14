'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Activity, ArrowLeft, Cpu, HardDrive, RefreshCw, Thermometer} from 'lucide-react';
import {Button, Card, CardBody, CardHeader, Select, SelectItem} from '@/components/ui';
import {MetricCard} from '@/components/ui';
import {toast} from 'sonner';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {useAuth} from '@/contexts/auth-context';

interface DeviceMetricsPageProps {
    params: { id: string };
}

interface MetricPoint {
    timestamp: string;
    value: number;
    unit: string;
}

interface MetricsData {
    cpu?: MetricPoint[];
    memory?: MetricPoint[];
    disk?: MetricPoint[];
    temperature?: MetricPoint[];
    [key: string]: MetricPoint[] | undefined;
}

const PERIODS = [
    {key: '1h', label: 'Last 1 hour'},
    {key: '6h', label: 'Last 6 hours'},
    {key: '24h', label: 'Last 24 hours'},
    {key: '7d', label: 'Last 7 days'},
];

function formatTimestamp(ts: string, period: string): string {
    const d = new Date(ts);
    if (period === '7d') return d.toLocaleDateString([], {month: 'short', day: 'numeric'});
    return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

function lastValue(series?: MetricPoint[]): number | null {
    if (!series || series.length === 0) return null;
    return series[series.length - 1].value;
}

function toChartData(series: MetricPoint[] | undefined, period: string) {
    if (!series) return [];
    return series.map(p => ({
        time: formatTimestamp(p.timestamp, period),
        value: Math.round(p.value * 10) / 10,
        unit: p.unit,
    }));
}

function MetricChart({
    title,
    color,
    data,
    unit,
}: {
    title: string;
    color: string;
    data: Array<{time: string; value: number; unit: string}>;
    unit: string;
}) {
    if (data.length === 0) {
        return (
            <Card>
                <CardHeader><h3 className="text-sm font-semibold">{title}</h3></CardHeader>
                <CardBody>
                    <div className="h-40 flex items-center justify-center text-default-400 text-sm">
                        No data available
                    </div>
                </CardBody>
            </Card>
        );
    }
    return (
        <Card>
            <CardHeader><h3 className="text-sm font-semibold">{title}</h3></CardHeader>
            <CardBody>
                <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={data} margin={{top: 4, right: 8, bottom: 4, left: 0}}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                        <XAxis
                            dataKey="time"
                            tick={{fontSize: 10}}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{fontSize: 10}}
                            tickFormatter={v => `${v}${unit}`}
                            domain={unit === '%' ? [0, 100] : ['auto', 'auto']}
                        />
                        <Tooltip
                            formatter={(v: number) => [`${v}${unit}`, title]}
                            labelStyle={{fontSize: 11}}
                            contentStyle={{fontSize: 12}}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );
}

export default function DeviceMetricsPage({params}: DeviceMetricsPageProps) {
    const router = useRouter();
    const {apiCall} = useAuth();

    const [deviceName, setDeviceName] = useState('');
    const [period, setPeriod] = useState('24h');
    const [metrics, setMetrics] = useState<MetricsData>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMetrics = useCallback(async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const res = await apiCall(`/api/devices/${params.id}/metrics?period=${period}`);
            if (!res.ok) throw new Error('Failed to fetch metrics');
            const result = await res.json();
            setMetrics((result.data ?? result).metrics ?? {});
        } catch {
            toast.error('Failed to load metrics');
        } finally {
            setRefreshing(false);
        }
    }, [params.id, period, apiCall]);

    useEffect(() => {
        async function init() {
            setLoading(true);
            try {
                const res = await apiCall(`/api/devices/${params.id}`);
                if (res.ok) {
                    const result = await res.json();
                    const d = result.data ?? result;
                    setDeviceName(d.hostname || d.name || 'Device');
                }
            } catch { /* ignored */ }
            await fetchMetrics();
            setLoading(false);
        }
        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    useEffect(() => {
        if (!loading) fetchMetrics();
    }, [period, fetchMetrics, loading]);

    const cpu = lastValue(metrics.cpu);
    const mem = lastValue(metrics.memory);
    const disk = lastValue(metrics.disk);
    const temp = lastValue(metrics.temperature);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-default-500">Loading metrics...</p>
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
                            <Activity className="w-6 h-6" />
                            Metrics — {deviceName}
                        </h1>
                        <p className="text-default-500 text-sm">Performance and resource usage over time</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        size="sm"
                        selectedKeys={[period]}
                        onSelectionChange={keys => setPeriod(Array.from(keys)[0] as string)}
                        className="w-40"
                        aria-label="Time period"
                    >
                        {PERIODS.map(p => (
                            <SelectItem key={p.key}>{p.label}</SelectItem>
                        ))}
                    </Select>
                    <Button
                        variant="bordered"
                        size="sm"
                        startContent={<RefreshCw className="w-4 h-4" />}
                        isLoading={refreshing}
                        onClick={() => fetchMetrics(true)}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Current values */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    label="CPU Usage"
                    value={cpu !== null ? `${Math.round(cpu)}%` : '—'}
                    icon={<Cpu className="w-5 h-5" />}
                    iconBg={cpu !== null && cpu > 80 ? 'bg-red-100' : cpu !== null && cpu > 60 ? 'bg-yellow-100' : 'bg-blue-100'}
                    iconColor={cpu !== null && cpu > 80 ? 'text-red-600' : cpu !== null && cpu > 60 ? 'text-yellow-600' : 'text-blue-600'}
                />
                <MetricCard
                    label="Memory Usage"
                    value={mem !== null ? `${Math.round(mem)}%` : '—'}
                    icon={<Activity className="w-5 h-5" />}
                    iconBg={mem !== null && mem > 85 ? 'bg-red-100' : mem !== null && mem > 70 ? 'bg-yellow-100' : 'bg-purple-100'}
                    iconColor={mem !== null && mem > 85 ? 'text-red-600' : mem !== null && mem > 70 ? 'text-yellow-600' : 'text-purple-600'}
                />
                <MetricCard
                    label="Disk Usage"
                    value={disk !== null ? `${Math.round(disk)}%` : '—'}
                    icon={<HardDrive className="w-5 h-5" />}
                    iconBg={disk !== null && disk > 90 ? 'bg-red-100' : disk !== null && disk > 75 ? 'bg-yellow-100' : 'bg-orange-100'}
                    iconColor={disk !== null && disk > 90 ? 'text-red-600' : disk !== null && disk > 75 ? 'text-yellow-600' : 'text-orange-600'}
                />
                <MetricCard
                    label="Temperature"
                    value={temp !== null ? `${Math.round(temp)}°C` : '—'}
                    icon={<Thermometer className="w-5 h-5" />}
                    iconBg={temp !== null && temp > 75 ? 'bg-red-100' : temp !== null && temp > 60 ? 'bg-yellow-100' : 'bg-green-100'}
                    iconColor={temp !== null && temp > 75 ? 'text-red-600' : temp !== null && temp > 60 ? 'text-yellow-600' : 'text-green-600'}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricChart
                    title="CPU Usage"
                    color="#0070f3"
                    data={toChartData(metrics.cpu, period)}
                    unit="%"
                />
                <MetricChart
                    title="Memory Usage"
                    color="#7928ca"
                    data={toChartData(metrics.memory, period)}
                    unit="%"
                />
                <MetricChart
                    title="Disk Usage"
                    color="#f5a623"
                    data={toChartData(metrics.disk, period)}
                    unit="%"
                />
                <MetricChart
                    title="Temperature"
                    color="#e53e3e"
                    data={toChartData(metrics.temperature, period)}
                    unit="°C"
                />
            </div>
        </div>
    );
}
