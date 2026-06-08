'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    Activity,
    AlertTriangle,
    ArrowUpCircle,
    Battery,
    Clock,
    Copy,
    Cpu,
    HardDrive,
    Power,
    RefreshCw,
    Server,
    Terminal,
    Thermometer,
    Wifi,
} from 'lucide-react';
import { StatusBadge, SeverityBadge, EmptyState } from '@/components/ui';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import DeviceNav from '@/components/device-nav';
import SSHTerminal from '@/components/ssh-terminal';
import {Button, Card, CardBody, Spinner} from '@/components/ui';

import {toast} from "sonner";
import {useDeviceQueries} from '@/hooks/queries/use-device-queries';
import {useDeviceCommands} from '@/hooks/commands/use-device-commands';
import {useDeviceMetrics} from '@/hooks/domain/use-device-metrics';
import {getDeviceCapabilities} from '@iotpilot/core/device/device-capabilities';

interface PendingSetupInfo {
    claimingToken: string | null;
    expiresAt: string | null;
    isExpired: boolean;
}

interface DeviceDetail {
    id: string;
    deviceId: string;
    hostname: string;
    deviceType: string;
    deviceModel?: string;
    rawStatus?: string;
    pendingSetup?: PendingSetupInfo | null;
    status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';
    location?: string;
    description?: string;
    lastSeen?: string;
    ipAddress?: string;
    tailscaleIp?: string;
    architecture?: string;
    uptime?: string;
    loadAverage?: string;
    lastBoot?: string;
    cpuUsage?: number;
    cpuTemp?: number;
    memoryUsage?: number;
    memoryTotal?: number;
    diskUsage?: number;
    diskTotal?: string;
    appStatus?: string;
    agentVersion?: string;
    alertCount: number;
    metrics?: Record<string, Array<{
        timestamp: string;
        value: number;
        unit?: string;
    }>>;
    alerts?: Array<{
        id: string;
        type: string;
        severity: string;
        title: string;
        message: string;
        createdAt: string;
    }>;
    commands?: Array<{
        id: string;
        command: string;
        status: string;
        createdAt: string;
        executedAt?: string;
    }>;
}

interface MetricData {
    timestamp: string;
    value: number;

    [key: string]: any;
}

export default function DeviceDetailPage({params}: {
    params: {
        id: string
    }
}) {
    const router = useRouter();
    const { getDevice, loading: queryLoading, error: queryError } = useDeviceQueries();
    const { updateDevice, sendCommand, sendCommandLoading, regenerateToken, regenerateTokenLoading } = useDeviceCommands();
    const { metrics: rawMetrics, refresh: refreshMetrics } = useDeviceMetrics(params.id, 30000);
    const metricsData: Record<string, any[]> = rawMetrics || {};

    const [device, setDevice] = useState<DeviceDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commandsExpanded, setCommandsExpanded] = useState(false);
    const [alertsExpanded, setAlertsExpanded] = useState(false);
    const [metricPeriod, setMetricPeriod] = useState('24h');
    const [showTerminal, setShowTerminal] = useState(false);

    const mapToDeviceDetail = useCallback((data: Record<string, unknown>): DeviceDetail => ({
        ...(data as unknown as DeviceDetail),
        id: String(data.id || data.deviceId || ''),
        deviceId: String(data.deviceId || data.id || ''),
        hostname: String(data.hostname || data.name || 'Unknown Device'),
        deviceType: String(data.deviceType || 'UNKNOWN'),
        status: String(data.status || 'UNKNOWN').toUpperCase() as DeviceDetail['status'],
        alertCount: Number(data.alertsCount || data.alertCount || 0),
    }), []);

    // Load device on mount
    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            const data = await getDevice(params.id);
            if (data) {
                setDevice(mapToDeviceDetail(data as unknown as Record<string, unknown>));
            } else {
                setError(queryError || 'Failed to load device');
            }
            setLoading(false);
        }
        load();
    }, [params.id]);

    // metricsData is fetched by useDeviceMetrics hook directly

    const issueCommand = async (command: string) => {
        if (!device) return;
        try {
            await sendCommand(device.id, command);
            toast.success(`Command "${command}" issued successfully`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to issue command.');
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDevice(params.id);
            if (data) {
                setDevice(mapToDeviceDetail(data as unknown as Record<string, unknown>));
            }
            refreshMetrics();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateToken = async () => {
        if (!device) return;
        const result = await regenerateToken(device.deviceId, device.hostname);
        if (result) {
            setDevice(prev => prev ? {
                ...prev,
                pendingSetup: { claimingToken: result.claimingToken, expiresAt: result.expiresAt, isExpired: false }
            } : prev);
            toast.success('Nuevo token generado — válido 15 minutos');
        } else {
            toast.error('Error al regenerar el token');
        }
    };

    // Format date for display
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleString();
        } catch {
            return 'Invalid date';
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString?: string) => {
        if (!dateString) return 'Never';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';

            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSec = Math.floor(diffMs / 1000);

            if (diffSec < 60) return `${diffSec}s ago`;
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            const diffHour = Math.floor(diffMin / 60);
            if (diffHour < 24) return `${diffHour}h ago`;
            const diffDay = Math.floor(diffHour / 24);
            return `${diffDay}d ago`;
        } catch {
            return 'Invalid date';
        }
    };

    // Format metrics data for chart
    const formatMetricsForChart = (metricType: string) => {
        if (!metricsData[metricType] || !Array.isArray(metricsData[metricType])) {
            return [];
        }

        return metricsData[metricType].map((item: any, index: number) => {
            try {
                const date = new Date(item.timestamp);
                return {
                    timestamp: isNaN(date.getTime()) ? `Point ${index}` : date.toLocaleTimeString(),
                    value: typeof item.value === 'number' ? item.value : 0,
                };
            } catch {
                return {
                    timestamp: `Point ${index}`,
                    value: 0,
                };
            }
        }).filter(item => item !== null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-default-50 flex items-center justify-center">
                <div className="text-center">
                    <Spinner size="lg" color="primary" className="mx-auto"/>
                    <p className="mt-4 text-default-600">Loading device details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-md mx-auto px-4 sm:px-6 py-6">
                <Card className="max-w-6xl mx-auto">
                    <CardBody className="text-center py-6">
                        <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-4"/>
                        <h2 className="text-xl font-bold text-danger mb-2">Error Loading Device</h2>
                        <p className="text-default-600 mb-4">{error}</p>
                        <div className="flex gap-2 justify-center">
                            <Button
                                onClick={handleRefresh}
                                color="primary"
                                startContent={<RefreshCw className="w-4 h-4"/>}
                            >
                                Retry
                            </Button>
                            <Button
                                onClick={() => router.push('/')}
                                color="default"
                                variant="flat"
                            >
                                Back to Dashboard
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    }

    if (!device) {
        return (
            <div className="max-w-md mx-auto px-4 sm:px-6 py-6">
                <Card className="max-w-6xl mx-auto">
                    <CardBody className="text-center py-6">
                        <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4"/>
                        <h2 className="text-xl font-bold mb-2">Device Not Found</h2>
                        <p className="text-default-600 mb-4">The requested device could not be found.</p>
                        <Button
                            onClick={() => router.push('/')}
                            color="primary"
                        >
                            View All Devices
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    const caps = getDeviceCapabilities(device.deviceType);

    return (
        <div>
            {/* Navigation */}
            <DeviceNav
                deviceId={device.id}
                hostname={device.hostname}
                status={device.status}
                alertCount={device.alertCount}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div className="flex items-center mb-4 md:mb-0">
                    <h1 className="text-2xl font-bold flex items-center">
                        {device.hostname}
                        <StatusBadge status={device.status} className="ml-3" />
                    </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={handleRefresh}
                        variant="bordered"
                        color="default"
                        startContent={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>}
                        isDisabled={loading}
                    >
                        Refresh
                    </Button>

                    {device.status === 'ONLINE' && (
                        <>
                            {caps.ssh && (
                                <Button
                                    onClick={() => setShowTerminal(true)}
                                    color="default"
                                    variant="solid"
                                    startContent={<Terminal className="w-4 h-4"/>}
                                >
                                    Terminal
                                </Button>
                            )}

                            {caps.commands && (
                                <Button
                                    onClick={() => issueCommand('reboot')}
                                    color="warning"
                                    startContent={<ArrowUpCircle className="w-4 h-4"/>}
                                    isDisabled={sendCommandLoading}
                                >
                                    {sendCommandLoading ? 'Issuing...' : 'Reboot'}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* PENDING_SETUP banner — device claimed but not yet activated */}
            {device.rawStatus === 'PENDING_SETUP' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                    <div className="flex items-start mb-3">
                        <Wifi className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5"/>
                        <div>
                            <p className="font-semibold text-blue-900">Dispositivo pendiente de activación</p>
                            <p className="text-sm text-blue-700 mt-0.5">
                                Conecta el dispositivo al AP WiFi <span className="font-mono font-bold">IotPilot-Setup-XXXX</span> e introduce el token de abajo.
                            </p>
                        </div>
                    </div>

                    {device.pendingSetup?.claimingToken && !device.pendingSetup.isExpired ? (
                        <div className="flex items-center gap-3 mt-3">
                            <div className="flex-1 bg-white border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
                                <span className="font-mono text-2xl font-bold tracking-widest text-blue-900">
                                    {device.pendingSetup.claimingToken}
                                </span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(device.pendingSetup!.claimingToken!);
                                        toast.success('Token copiado');
                                    }}
                                    className="ml-3 text-blue-400 hover:text-blue-600 transition-colors"
                                    title="Copiar token"
                                >
                                    <Copy className="w-5 h-5"/>
                                </button>
                            </div>
                            {device.pendingSetup.expiresAt && (
                                <p className="text-sm text-blue-600 whitespace-nowrap">
                                    Expira: {new Date(device.pendingSetup.expiresAt).toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="mt-3 flex items-center gap-3">
                            <p className="text-sm text-amber-700 font-medium">El token ha expirado.</p>
                            <Button
                                size="sm"
                                color="primary"
                                variant="flat"
                                onClick={handleRegenerateToken}
                                isLoading={regenerateTokenLoading}
                                startContent={!regenerateTokenLoading ? <RefreshCw className="w-4 h-4"/> : undefined}
                            >
                                Regenerar Token
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Reclassification banner for untyped devices */}
            {(device.deviceType === 'GENERIC' || device.deviceType === 'UNKNOWN') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0"/>
                        <div>
                            <p className="font-medium text-amber-800">Device type not set</p>
                            <p className="text-sm text-amber-600">Set the correct device type in settings to see relevant metrics and controls.</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="flat"
                        color="warning"
                        onClick={() => router.push(`/devices/${device.id}/settings`)}
                    >
                        Set Type
                    </Button>
                </div>
            )}

            {/* Device Info and System Metrics */}
            <div className={`grid grid-cols-1 ${caps.systemMetrics ? 'lg:grid-cols-3' : ''} gap-6 mb-6`}>
                {/* Device Info */}
                <div className={`bg-white rounded-lg shadow-md p-6 ${caps.systemMetrics ? 'lg:col-span-1' : ''}`}>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                        <Server className="w-5 h-5 mr-2 text-blue-600"/>
                        Device Information
                    </h2>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">Device ID</p>
                            <p className="font-medium">{device.deviceId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Type</p>
                            <p className="font-medium">{device.deviceType} {device.deviceModel ? `(${device.deviceModel})` : ''}</p>
                        </div>
                        {caps.systemInfo && (
                            <div>
                                <p className="text-sm text-gray-500">Architecture</p>
                                <p className="font-medium">{device.architecture || 'Unknown'}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-gray-500">IP Address</p>
                            <p className="font-medium font-mono text-sm">{device.ipAddress || 'Unknown'}</p>
                        </div>
                        {device.tailscaleIp && (
                            <div>
                                <p className="text-sm text-gray-500">Tailscale IP</p>
                                <p className="font-medium font-mono text-sm">{device.tailscaleIp}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="font-medium">{device.location || 'Not specified'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Description</p>
                            <p className="font-medium">{device.description || 'No description'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Last Seen</p>
                            <p className="font-medium">{formatTimeAgo(device.lastSeen)}</p>
                        </div>
                        {caps.systemInfo && (
                            <>
                                <div>
                                    <p className="text-sm text-gray-500">Last Boot</p>
                                    <p className="font-medium">{formatDate(device.lastBoot)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Uptime</p>
                                    <p className="font-medium">{device.uptime || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Agent Version</p>
                                    <p className="font-medium">{device.agentVersion || 'Unknown'}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* System Metrics — edge computers only */}
                {caps.systemMetrics && <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-blue-600"/>
                            System Metrics
                        </h2>
                        <div className="flex space-x-2">
                            {['1h', '6h', '24h'].map((period) => (
                                <Button
                                    key={period}
                                    size="sm"
                                    variant={metricPeriod === period ? 'flat' : 'light'}
                                    color={metricPeriod === period ? 'primary' : 'default'}
                                    onClick={() => setMetricPeriod(period)}
                                >
                                    {period}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Current Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                                <Cpu className="w-5 h-5 text-blue-600 mr-2"/>
                                <h3 className="font-medium text-gray-700">CPU Usage</h3>
                            </div>
                            <p className="text-2xl font-bold">{device.cpuUsage != null ? `${device.cpuUsage.toFixed(1)}%` : 'N/A'}</p>
                            <p className="text-sm text-gray-500">Load: {device.loadAverage || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                                <Thermometer className="w-5 h-5 text-red-500 mr-2"/>
                                <h3 className="font-medium text-gray-700">CPU Temperature</h3>
                            </div>
                            <p className="text-2xl font-bold">{device.cpuTemp != null ? `${device.cpuTemp.toFixed(1)}°C` : 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                                <HardDrive className="w-5 h-5 text-green-600 mr-2"/>
                                <h3 className="font-medium text-gray-700">Memory</h3>
                            </div>
                            <p className="text-2xl font-bold">
                                {device.memoryUsage != null ? `${device.memoryUsage.toFixed(1)}%` : 'N/A'}
                            </p>
                            {device.memoryTotal && (
                                <p className="text-sm text-gray-500">
                                    {/* FIXED: memoryTotal is already in MB, just convert to GB */}
                                    {(device.memoryTotal / 1024).toFixed(1)} GB Total
                                </p>
                            )}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                                <HardDrive className="w-5 h-5 text-purple-600 mr-2"/>
                                <h3 className="font-medium text-gray-700">Disk</h3>
                            </div>
                            <p className="text-2xl font-bold">{device.diskUsage != null ? `${device.diskUsage.toFixed(1)}%` : 'N/A'}</p>
                            <p className="text-sm text-gray-500">Total: {device.diskTotal || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Metric Charts */}
                    <div className="space-y-6">
                        {/* CPU Usage Chart */}
                        {metricsData.cpu_usage && metricsData.cpu_usage.length > 0 && (
                            <div>
                                <h3 className="font-medium text-gray-700 mb-2">CPU Usage Over Time</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={formatMetricsForChart('cpu_usage')}>
                                            <CartesianGrid strokeDasharray="3 3"/>
                                            <XAxis dataKey="timestamp"/>
                                            <YAxis domain={[0, 100]}/>
                                            <Tooltip/>
                                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
                                                  dot={false}/>
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Memory Usage Chart */}
                        {metricsData.memory_usage && metricsData.memory_usage.length > 0 && (
                            <div>
                                <h3 className="font-medium text-gray-700 mb-2">Memory Usage Over Time</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={formatMetricsForChart('memory_usage')}>
                                            <CartesianGrid strokeDasharray="3 3"/>
                                            <XAxis dataKey="timestamp"/>
                                            <YAxis domain={[0, 100]}/>
                                            <Tooltip/>
                                            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2}
                                                  dot={false}/>
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* CPU Temperature Chart */}
                        {metricsData.cpu_temperature && metricsData.cpu_temperature.length > 0 && (
                            <div>
                                <h3 className="font-medium text-gray-700 mb-2">CPU Temperature Over Time</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={formatMetricsForChart('cpu_temperature')}>
                                            <CartesianGrid strokeDasharray="3 3"/>
                                            <XAxis dataKey="timestamp"/>
                                            <YAxis/>
                                            <Tooltip/>
                                            <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2}
                                                  dot={false}/>
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>}
            </div>

            {/* Sensor Metrics — sensors only */}
            {caps.sensorMetrics && (metricsData.temperature || metricsData.battery_level || metricsData.wifi_rssi) && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                        <Thermometer className="w-5 h-5 mr-2 text-blue-600"/>
                        Sensor Readings
                    </h2>

                    {/* Current Values */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {metricsData.temperature && metricsData.temperature.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-4">
                                <div className="flex items-center mb-2">
                                    <Thermometer className="w-5 h-5 text-blue-600 mr-2"/>
                                    <h3 className="font-medium text-gray-700">Temperature</h3>
                                </div>
                                <p className="text-3xl font-bold">
                                    {metricsData.temperature[metricsData.temperature.length - 1].value.toFixed(1)}°C
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {formatTimeAgo(metricsData.temperature[metricsData.temperature.length - 1].timestamp)}
                                </p>
                            </div>
                        )}
                        {metricsData.battery_level && metricsData.battery_level.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-4">
                                <div className="flex items-center mb-2">
                                    <Battery className="w-5 h-5 text-green-600 mr-2"/>
                                    <h3 className="font-medium text-gray-700">Battery</h3>
                                </div>
                                <p className="text-3xl font-bold">
                                    {metricsData.battery_level[metricsData.battery_level.length - 1].value.toFixed(0)}%
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {formatTimeAgo(metricsData.battery_level[metricsData.battery_level.length - 1].timestamp)}
                                </p>
                            </div>
                        )}
                        {metricsData.wifi_rssi && metricsData.wifi_rssi.length > 0 && (
                            <div className="bg-purple-50 rounded-lg p-4">
                                <div className="flex items-center mb-2">
                                    <Wifi className="w-5 h-5 text-purple-600 mr-2"/>
                                    <h3 className="font-medium text-gray-700">WiFi Signal</h3>
                                </div>
                                <p className="text-3xl font-bold">
                                    {metricsData.wifi_rssi[metricsData.wifi_rssi.length - 1].value} dBm
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {metricsData.wifi_rssi[metricsData.wifi_rssi.length - 1].value > -50 ? 'Excellent' :
                                     metricsData.wifi_rssi[metricsData.wifi_rssi.length - 1].value > -60 ? 'Good' :
                                     metricsData.wifi_rssi[metricsData.wifi_rssi.length - 1].value > -70 ? 'Fair' : 'Weak'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Temperature Chart */}
                    {metricsData.temperature && metricsData.temperature.length > 1 && (
                        <div className="mb-6">
                            <h3 className="font-medium text-gray-700 mb-2">Temperature History</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formatMetricsForChart('temperature')}>
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis dataKey="timestamp"/>
                                        <YAxis/>
                                        <Tooltip formatter={(value: number) => [`${value.toFixed(1)}°C`, 'Temperature']}/>
                                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false}/>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Battery Chart */}
                    {metricsData.battery_level && metricsData.battery_level.length > 1 && (
                        <div>
                            <h3 className="font-medium text-gray-700 mb-2">Battery History</h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formatMetricsForChart('battery_level')}>
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis dataKey="timestamp"/>
                                        <YAxis domain={[0, 100]}/>
                                        <Tooltip formatter={(value: number) => [`${value.toFixed(0)}%`, 'Battery']}/>
                                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false}/>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Commands and Alerts */}
            <div className={`grid grid-cols-1 ${caps.commands ? 'lg:grid-cols-2' : ''} gap-6`}>
                {/* Commands — edge computers only */}
                {caps.commands && <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <Terminal className="w-5 h-5 mr-2 text-blue-600"/>
                            Commands
                        </h2>
                        {device.commands && device.commands.length > 3 && (
                            <Button
                                size="sm"
                                variant="light"
                                color="primary"
                                onClick={() => setCommandsExpanded(!commandsExpanded)}
                            >
                                {commandsExpanded ? 'Show Less' : 'Show All'}
                            </Button>
                        )}
                    </div>

                    {device.status === 'ONLINE' && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="flat"
                                color="warning"
                                onClick={() => issueCommand('reboot')}
                                disabled={sendCommandLoading}
                                startContent={<Power className="w-4 h-4"/>}
                            >
                                Reboot
                            </Button>
                            <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                onClick={() => issueCommand('update')}
                                disabled={sendCommandLoading}
                                startContent={<RefreshCw className="w-4 h-4"/>}
                            >
                                Update Agent
                            </Button>
                            <Button
                                size="sm"
                                variant="flat"
                                color="success"
                                onClick={() => issueCommand('restart')}
                                disabled={sendCommandLoading}
                                startContent={<ArrowUpCircle className="w-4 h-4"/>}
                            >
                                Restart
                            </Button>
                        </div>
                    )}

                    {device.commands && device.commands.length > 0 ? (
                        <div className="space-y-3">
                            {device.commands.slice(0, commandsExpanded ? undefined : 3).map(cmd => (
                                <div key={cmd.id} className="border rounded-lg p-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center">
                                            <Terminal className="w-4 h-4 text-gray-600 mr-2"/>
                                            <span className="font-medium">{cmd.command}</span>
                                        </div>
                                        <StatusBadge status={cmd.status} variant="flat" size="sm" />
                                    </div>
                                    <div className="mt-2 text-sm text-gray-500 flex items-center">
                                        <Clock className="w-3 h-3 mr-1"/>
                                        {formatDate(cmd.createdAt)}
                                        {cmd.executedAt && (
                                            <span className="ml-3">
                                                Executed: {formatDate(cmd.executedAt)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="No commands have been issued to this device." />
                    )}
                </div>}

                {/* Alerts */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500"/>
                            Alerts
                            {device.alertCount > 0 && (
                                <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                    {device.alertCount}
                                </span>
                            )}
                        </h2>
                        {device.alerts && device.alerts.length > 3 && (
                            <Button
                                size="sm"
                                variant="light"
                                color="primary"
                                onClick={() => setAlertsExpanded(!alertsExpanded)}
                            >
                                {alertsExpanded ? 'Show Less' : 'Show All'}
                            </Button>
                        )}
                    </div>

                    {device.alerts && device.alerts.length > 0 ? (
                        <div className="space-y-3">
                            {device.alerts.slice(0, alertsExpanded ? undefined : 3).map(alert => (
                                <div key={alert.id} className="border rounded-lg p-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center">
                                                <AlertTriangle className="w-4 h-4 text-amber-500 mr-2"/>
                                                <span className="font-medium">{alert.title}</span>
                                            </div>
                                            <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                                        </div>
                                        <SeverityBadge severity={alert.severity} />
                                    </div>
                                    <div className="mt-2 text-sm text-gray-500 flex items-center">
                                        <Clock className="w-3 h-3 mr-1"/>
                                        {formatDate(alert.createdAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="No active alerts for this device." />
                    )}
                </div>
            </div>

            {/* SSH Terminal — edge computers only */}
            {caps.ssh && showTerminal && device && (
                <div className="mt-6">
                    <SSHTerminal deviceId={device.id} />
                </div>
            )}
        </div>
    );
}
