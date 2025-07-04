'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    Activity,
    AlertTriangle,
    ArrowUpCircle,
    Clock,
    Cpu,
    HardDrive,
    Power,
    RefreshCw,
    Server,
    Terminal,
    Thermometer,
    Wifi,
    WifiOff
} from 'lucide-react';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import DeviceNav from '@/components/device-nav';
import SSHTerminal from '@/components/ssh-terminal';
import {Button, Card, CardBody, Chip, Spinner} from '@heroui/react';
import {toast} from "sonner";

interface DeviceDetail {
    id: string;
    deviceId: string;
    hostname: string;
    deviceType: string;
    deviceModel?: string;
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
    const [device, setDevice] = useState<DeviceDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [issuingCommand, setIssuingCommand] = useState(false);
    const [commandsExpanded, setCommandsExpanded] = useState(false);
    const [alertsExpanded, setAlertsExpanded] = useState(false);
    const [metricPeriod, setMetricPeriod] = useState('24h');
    const [metrics, setMetrics] = useState<Record<string, MetricData[]>>({});
    const [showTerminal, setShowTerminal] = useState(false);
    const router = useRouter();

    // Fetch device details
    useEffect(() => {
        async function fetchDeviceDetails() {
            try {
                setLoading(true);
                const response = await fetch(`/api/devices/${params.id}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Device not found');
                    }
                    throw new Error(`Failed to fetch device details: ${response.status}`);
                }

                const data = await response.json();
                setDevice(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error occurred');
            } finally {
                setLoading(false);
            }
        }

        if (params.id) {
            fetchDeviceDetails();

            // Poll for updates every 30 seconds
            const interval = setInterval(fetchDeviceDetails, 30000);
            return () => clearInterval(interval);
        }
    }, [params.id]);

    // Fetch metrics with selected period
    useEffect(() => {
        async function fetchMetrics() {
            if (!device) return;

            try {
                const response = await fetch(`/api/devices/${params.id}/metrics?period=${metricPeriod}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch metrics');
                }

                const data = await response.json();
                setMetrics(data.metrics || {});
            } catch (err) {
            }
        }

        fetchMetrics();
    }, [params.id, metricPeriod, device]);

    // Issue command to device
    const issueCommand = async (command: string) => {
        if (issuingCommand || !device) return;

        setIssuingCommand(true);
        try {
            const response = await fetch(`/api/devices/${params.id}/commands`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({command}),
            });

            if (!response.ok) {
                throw new Error('Failed to issue command');
            }

            // Refetch device details after command is issued
            setTimeout(async () => {
                try {
                    const deviceResponse = await fetch(`/api/devices/${params.id}`);
                    if (deviceResponse.ok) {
                        const data = await deviceResponse.json();
                        setDevice(data);
                    }
                } catch (err) {
                }
            }, 1000);

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to issue command.');
        } finally {
            setIssuingCommand(false);
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
        if (!metrics || !metrics[metricType] || !Array.isArray(metrics[metricType])) {
            return [];
        }

        return metrics[metricType].map((item, index) => {
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

    // Get status color based on device status
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ONLINE':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'OFFLINE':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'MAINTENANCE':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'ERROR':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Get status icon based on device status
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ONLINE':
                return <Wifi className="w-5 h-5 text-green-500"/>;
            case 'OFFLINE':
                return <WifiOff className="w-5 h-5 text-red-500"/>;
            case 'MAINTENANCE':
                return <Clock className="w-5 h-5 text-yellow-500"/>;
            case 'ERROR':
                return <AlertTriangle className="w-5 h-5 text-red-600"/>;
            default:
                return <WifiOff className="w-5 h-5 text-gray-400"/>;
        }
    };

    // Get alert severity color
    const getAlertSeverityColor = (severity: string) => {
        switch (severity) {
            case 'INFO':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'WARNING':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'ERROR':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'CRITICAL':
                return 'bg-red-700 text-white border-red-800';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Get command status color
    const getCommandStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'PENDING':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'RUNNING':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'FAILED':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'TIMEOUT':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Handle refresh button click
    const handleRefresh = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/devices/${params.id}`);
            if (!response.ok) throw new Error('Failed to fetch device details');

            const data = await response.json();
            setDevice(data);
            setError(null);

            // Also refresh metrics
            try {
                const metricsResponse = await fetch(`/api/devices/${params.id}/metrics?period=${metricPeriod}`);
                if (metricsResponse.ok) {
                    const metricsData = await metricsResponse.json();
                    setMetrics(metricsData.metrics || {});
                }
            } catch (err) {
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
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
                        <Chip
                            className="ml-3"
                            startContent={getStatusIcon(device.status)}
                            variant="bordered"
                            color={
                                device.status === 'ONLINE' ? 'success' :
                                    device.status === 'OFFLINE' ? 'danger' :
                                        device.status === 'MAINTENANCE' ? 'warning' : 'default'
                            }
                        >
                            {device.status}
                        </Chip>
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
                            <Button
                                onClick={() => setShowTerminal(true)}
                                color="default"
                                variant="solid"
                                startContent={<Terminal className="w-4 h-4"/>}
                            >
                                Terminal
                            </Button>

                            <Button
                                onClick={() => issueCommand('reboot')}
                                color="warning"
                                startContent={<ArrowUpCircle className="w-4 h-4"/>}
                                isDisabled={issuingCommand}
                            >
                                {issuingCommand ? 'Issuing...' : 'Reboot'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Device Info and System Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Device Info */}
                <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-1">
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
                        <div>
                            <p className="text-sm text-gray-500">Architecture</p>
                            <p className="font-medium">{device.architecture || 'Unknown'}</p>
                        </div>
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
                    </div>
                </div>

                {/* System Metrics */}
                <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-blue-600"/>
                            System Metrics
                        </h2>
                        <div className="flex space-x-2">
                            {['1h', '6h', '24h'].map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setMetricPeriod(period)}
                                    className={`px-2 py-1 text-sm rounded ${
                                        metricPeriod === period
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {period}
                                </button>
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
                        {metrics.cpu_usage && metrics.cpu_usage.length > 0 && (
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
                        {metrics.memory_usage && metrics.memory_usage.length > 0 && (
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
                        {metrics.cpu_temperature && metrics.cpu_temperature.length > 0 && (
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
                </div>
            </div>

            {/* Commands and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Commands */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <Terminal className="w-5 h-5 mr-2 text-blue-600"/>
                            Commands
                        </h2>
                        {device.commands && device.commands.length > 3 && (
                            <button
                                onClick={() => setCommandsExpanded(!commandsExpanded)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                {commandsExpanded ? 'Show Less' : 'Show All'}
                            </button>
                        )}
                    </div>

                    {device.status === 'ONLINE' && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            <button
                                onClick={() => issueCommand('reboot')}
                                className="bg-amber-100 text-amber-800 px-3 py-1 rounded hover:bg-amber-200 transition flex items-center text-sm"
                                disabled={issuingCommand}
                            >
                                <Power className="w-4 h-4 mr-1"/>
                                Reboot
                            </button>
                            <button
                                onClick={() => issueCommand('update')}
                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200 transition flex items-center text-sm"
                                disabled={issuingCommand}
                            >
                                <RefreshCw className="w-4 h-4 mr-1"/>
                                Update Agent
                            </button>
                            <button
                                onClick={() => issueCommand('restart')}
                                className="bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 transition flex items-center text-sm"
                                disabled={issuingCommand}
                            >
                                <ArrowUpCircle className="w-4 h-4 mr-1"/>
                                Restart
                            </button>
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
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full border ${getCommandStatusColor(cmd.status)}`}>
                                            {cmd.status}
                                        </span>
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
                        <p className="text-gray-500 italic">No commands have been issued to this device.</p>
                    )}
                </div>

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
                            <button
                                onClick={() => setAlertsExpanded(!alertsExpanded)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                {alertsExpanded ? 'Show Less' : 'Show All'}
                            </button>
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
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full border ${getAlertSeverityColor(alert.severity)}`}>
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-sm text-gray-500 flex items-center">
                                        <Clock className="w-3 h-3 mr-1"/>
                                        {formatDate(alert.createdAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">No active alerts for this device.</p>
                    )}
                </div>
            </div>

            {/* SSH Terminal */}
            {showTerminal && device && (
                <div className="mt-6">
                    <SSHTerminal
                        deviceId={device.id}
                        hostname={device.hostname}
                        onClose={() => setShowTerminal(false)}
                    />
                </div>
            )}
        </div>
    );
}
