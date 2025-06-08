'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {AlertTriangle, Clock, Cpu, RefreshCw, Search, Server, Settings, Thermometer, Wifi, WifiOff} from 'lucide-react';
import {getApiTimeout, getApiUrl, getLimit, getRefreshInterval, isDevelopment} from '@/lib/env';
import {useAuth} from '@/contexts/auth-context'; // Add this import
import {Button, Card, CardBody, Chip, Divider, Input, Progress, Spinner} from '@heroui/react';

interface Device {
    id: string;
    deviceId: string;
    hostname: string;
    deviceType: string;
    deviceModel?: string;
    status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';
    location?: string;
    lastSeen?: string;
    cpuUsage?: number;
    cpuTemp?: number;
    memoryUsage?: number;
    diskUsage?: number;
    uptime?: string;
    alertCount: number;
    ipAddress?: string;
    tailscaleIp?: string;
}

interface DeviceStats {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    error: number;
}

export default function DeviceList() {
    const {apiCall} = useAuth(); // Add this line
    const [devices, setDevices] = useState<Device[]>([]);
    const [stats, setStats] = useState<DeviceStats>({
        total: 0,
        online: 0,
        offline: 0,
        maintenance: 0,
        error: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Get environment-specific configurations
    const refreshInterval = getRefreshInterval('device');
    const maxDevices = getLimit('devices');

    // Fetch devices on component mount
    useEffect(() => {
        fetchDevices();

        // Set up auto-refresh with environment-specific interval
        const interval = setInterval(fetchDevices, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]); // Remove apiCall from dependencies to avoid unnecessary re-renders

    // Fetch devices from API with environment configuration - UPDATED
    const fetchDevices = async () => {
        try {
            const url = new URL(getApiUrl('/devices'));

            // Add filters if any
            if (filterStatus) {
                url.searchParams.append('status', filterStatus);
            }

            // CHANGED: Use apiCall instead of fetch with custom timeout
            // Note: apiCall handles credentials and 401 responses automatically
            const response = await apiCall(url.toString(), {
                // Remove signal/timeout handling as apiCall may handle this internally
                // If you need custom timeout, you can wrap apiCall with your own AbortController
            });

            if (!response.ok) throw new Error('Failed to fetch devices');

            const data = await response.json();

            // Apply device limit from environment
            const limitedDevices = data.devices.slice(0, maxDevices);
            if (data.devices.length > maxDevices) {
                console.warn(`Device limit reached: showing ${maxDevices} of ${data.devices.length} devices`);
            }

            setDevices(limitedDevices);
            setStats(data.stats);
            setLastUpdate(new Date());
            setError(null);
        } catch (err) {
            if (err instanceof Error) {
                if (err.name === 'AbortError') {
                    setError('Request timed out. Please try again.');
                } else {
                    setError(err.message);
                }
            } else {
                setError('Unknown error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    // Filter devices based on search term and status filter
    const filteredDevices = devices.filter(device => {
        // Filter by search term
        const matchesSearch = searchTerm === '' ||
            device.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (device.location && device.location.toLowerCase().includes(searchTerm.toLowerCase()));

        // Filter by status
        const matchesStatus = filterStatus === null || device.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    // Format last seen as time ago
    const formatTimeAgo = (dateString?: string) => {
        if (!dateString) return 'Never';

        const date = new Date(dateString);
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
    };

    // Format uptime
    const formatUptime = (uptime?: string) => {
        if (!uptime) return 'Unknown';
        return uptime.replace('up ', '');
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

    // Get status color
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

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <Spinner size="lg" color="primary" className="mx-auto"/>
                    <p className="mt-4 text-gray-600">Loading devices...</p>
                    {isDevelopment() && (
                        <p className="text-xs text-gray-400 mt-2">
                            Timeout: {getApiTimeout() / 1000}s | Refresh: {refreshInterval / 1000}s
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                {/* Total Devices */}
                <Card className="mb-0">
                    <CardBody className="p-6 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-default-600 mb-1">Total Devices</p>
                                <p className="text-3xl font-bold text-foreground">
                                    {stats.total}
                                </p>
                            </div>
                            <div className="p-3 bg-primary-100 rounded-xl">
                                <Server className="w-6 h-6 text-primary-600"/>
                            </div>
                        </div>
                        {devices.length >= maxDevices && (
                            <div className="flex justify-center">
                                <Chip size="sm" color="warning" variant="flat">
                                    Limit: {maxDevices}
                                </Chip>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Online Devices */}
                <Card className="mb-0">
                    <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-default-600 mb-1">Online</p>
                                <p className="text-3xl font-bold text-success-600">
                                    {stats.online}
                                </p>
                            </div>
                            <div className="p-3 bg-success-100 rounded-xl">
                                <Wifi className="w-6 h-6 text-success-600"/>
                            </div>
                        </div>
                        {stats.total > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-default-500">Percentage</span>
                                    <span
                                        className="font-medium">{((stats.online / stats.total) * 100).toFixed(1)}%</span>
                                </div>
                                <Progress
                                    value={(stats.online / stats.total) * 100}
                                    color="success"
                                    size="sm"
                                    className="w-full"
                                />
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Offline Devices */}
                <Card className="mb-0">
                    <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-default-600 mb-1">Offline</p>
                                <p className="text-3xl font-bold text-default-600">
                                    {stats.offline}
                                </p>
                            </div>
                            <div className="p-3 bg-default-100 rounded-xl">
                                <WifiOff className="w-6 h-6 text-default-600"/>
                            </div>
                        </div>
                        {stats.total > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-default-500">Percentage</span>
                                    <span
                                        className="font-medium">{((stats.offline / stats.total) * 100).toFixed(1)}%</span>
                                </div>
                                <Progress
                                    value={(stats.offline / stats.total) * 100}
                                    color="default"
                                    size="sm"
                                    className="w-full"
                                />
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Maintenance Devices */}
                <Card className="mb-0">
                    <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-default-600 mb-1">Maintenance</p>
                                <p className="text-3xl font-bold text-warning-600">
                                    {stats.maintenance}
                                </p>
                            </div>
                            <div className="p-3 bg-warning-100 rounded-xl">
                                <Settings className="w-6 h-6 text-warning-600"/>
                            </div>
                        </div>
                        {stats.total > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-default-500">Percentage</span>
                                    <span
                                        className="font-medium">{((stats.maintenance / stats.total) * 100).toFixed(1)}%</span>
                                </div>
                                <Progress
                                    value={(stats.maintenance / stats.total) * 100}
                                    color="warning"
                                    size="sm"
                                    className="w-full"
                                />
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Error Devices */}
                <Card className="mb-0">
                    <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-default-600 mb-1">Errors</p>
                                <p className="text-3xl font-bold text-danger-600">
                                    {stats.error}
                                </p>
                            </div>
                            <div className="p-3 bg-danger-100 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-danger-600"/>
                            </div>
                        </div>
                        {stats.total > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-default-500">Percentage</span>
                                    <span
                                        className="font-medium">{((stats.error / stats.total) * 100).toFixed(1)}%</span>
                                </div>
                                <Progress
                                    value={(stats.error / stats.total) * 100}
                                    color="danger"
                                    size="sm"
                                    className="w-full"
                                />
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardBody>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-grow">
                            <Input
                                type="text"
                                placeholder="Search devices..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                startContent={<Search className="h-5 w-5 text-default-400"/>}
                                className="w-full"
                            />
                        </div>

                        <div className="flex space-x-2">
                            <Button
                                onClick={() => setFilterStatus(null)}
                                color={filterStatus === null ? "primary" : "default"}
                                variant={filterStatus === null ? "flat" : "light"}
                                size="sm"
                            >
                                All
                            </Button>
                            <Button
                                onClick={() => setFilterStatus('ONLINE')}
                                color={filterStatus === 'ONLINE' ? "success" : "default"}
                                variant={filterStatus === 'ONLINE' ? "flat" : "light"}
                                size="sm"
                            >
                                Online
                            </Button>
                            <Button
                                onClick={() => setFilterStatus('OFFLINE')}
                                color={filterStatus === 'OFFLINE' ? "danger" : "default"}
                                variant={filterStatus === 'OFFLINE' ? "flat" : "light"}
                                size="sm"
                            >
                                Offline
                            </Button>
                            <Button
                                onClick={fetchDevices}
                                color="default"
                                variant="light"
                                size="sm"
                                startContent={<RefreshCw className="w-4 h-4"/>}
                            >
                                Refresh
                            </Button>
                        </div>
                    </div>

                    <div className="mt-2 text-sm text-default-500">
                        Last updated: {lastUpdate.toLocaleTimeString()} •
                        Showing {filteredDevices.length} of {devices.length} devices
                        {isDevelopment() && (
                            <Chip size="sm" color="primary" variant="flat" className="ml-2">
                                Auto-refresh: {refreshInterval / 1000}s
                            </Chip>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* Device Grid */}
            {error && (
                <Card className="mb-6 bg-danger-50 border-danger">
                    <CardBody>
                        <div className="flex items-center">
                            <AlertTriangle className="w-5 h-5 text-danger mr-2"/>
                            <p className="text-danger">{error}</p>
                        </div>
                    </CardBody>
                </Card>
            )}

            {filteredDevices.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredDevices.map((device) => (
                        <Card
                            key={device.id}
                            isPressable
                            as={Link}
                            href={`/devices/${device.id}`}
                            className="p-0"
                        >
                            <CardBody className="p-6">
                                {/* Device Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        {getStatusIcon(device.status)}
                                        <div className="ml-3">
                                            <h3 className="text-lg font-semibold text-foreground">{device.hostname}</h3>
                                            <p className="text-sm text-default-500">{device.deviceType} {device.deviceModel ? `• ${device.deviceModel}` : ''}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <Chip
                                            size="sm"
                                            color={
                                                device.status === 'ONLINE' ? 'success' :
                                                    device.status === 'OFFLINE' ? 'danger' :
                                                        device.status === 'MAINTENANCE' ? 'warning' : 'danger'
                                            }
                                            variant="flat"
                                        >
                                            {device.status}
                                        </Chip>
                                        {device.alertCount > 0 && (
                                            <Chip
                                                size="sm"
                                                color="danger"
                                                variant="flat"
                                                className="mt-1"
                                            >
                                                {device.alertCount} alerts
                                            </Chip>
                                        )}
                                    </div>
                                </div>

                                {/* Device Info */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-default-500">Location:</span>
                                        <span className="text-foreground">{device.location || 'Unknown'}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-default-500">IP Address:</span>
                                        <span className="text-foreground font-mono text-xs">
                                            {device.tailscaleIp || device.ipAddress || 'Unknown'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-default-500">Last Seen:</span>
                                        <span className="text-foreground">{formatTimeAgo(device.lastSeen)}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-default-500">Uptime:</span>
                                        <span className="text-foreground">{formatUptime(device.uptime)}</span>
                                    </div>
                                </div>

                                {/* Metrics */}
                                {device.status === 'ONLINE' && (
                                    <>
                                        <Divider className="my-4"/>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center">
                                                <Cpu className="w-4 h-4 text-primary mr-2"/>
                                                <div>
                                                    <p className="text-xs text-default-500">CPU</p>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {device.cpuUsage?.toFixed(1) || '0'}%
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center">
                                                <Thermometer className="w-4 h-4 text-danger mr-2"/>
                                                <div>
                                                    <p className="text-xs text-default-500">Temp</p>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {device.cpuTemp?.toFixed(1) || '0'}°C
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardBody>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardBody className="py-12 text-center">
                        <Server className="w-16 h-16 text-default-400 mx-auto mb-4"/>
                        <h3 className="text-lg font-medium text-foreground mb-2">No devices found</h3>
                        <p className="text-default-500">
                            {searchTerm || filterStatus
                                ? 'Try adjusting your search or filters.'
                                : 'Start by registering your first IoT device using the device agent installer.'}
                        </p>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}