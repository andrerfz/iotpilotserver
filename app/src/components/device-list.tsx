'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Server,
    Thermometer,
    Cpu,
    HardDrive,
    AlertTriangle,
    Wifi,
    WifiOff,
    Clock,
    Search,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getApiUrl,
    getApiTimeout,
    getRefreshInterval,
    getLimit,
    isDevelopment,
    getFetchConfig
} from '@/lib/env';

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
    const [devices, setDevices] = useState<Device[]>([]);
    const [stats, setStats] = useState<DeviceStats>({
        total: 0, online: 0, offline: 0, maintenance: 0, error: 0
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
    }, [refreshInterval]);

    // Fetch devices from API with environment configuration
    const fetchDevices = async () => {
        try {
            const url = new URL(getApiUrl('/devices'));

            // Add filters if any
            if (filterStatus) {
                url.searchParams.append('status', filterStatus);
            }

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), getApiTimeout());

            const response = await fetch(url.toString(), {
                ...getFetchConfig(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

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
            case 'ONLINE': return <Wifi className="w-5 h-5 text-green-500" />;
            case 'OFFLINE': return <WifiOff className="w-5 h-5 text-red-500" />;
            case 'MAINTENANCE': return <Clock className="w-5 h-5 text-yellow-500" />;
            case 'ERROR': return <AlertTriangle className="w-5 h-5 text-red-600" />;
            default: return <WifiOff className="w-5 h-5 text-gray-400" />;
        }
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ONLINE': return 'bg-green-100 text-green-800 border-green-200';
            case 'OFFLINE': return 'bg-red-100 text-red-800 border-red-200';
            case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'ERROR': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Devices</p>
                            <p className="text-3xl font-bold text-gray-900">
                                {stats.total}
                                {devices.length >= maxDevices && (
                                    <span className="text-xs text-amber-600 ml-1">
                                        (limit: {maxDevices})
                                    </span>
                                )}
                            </p>
                        </div>
                        <Server className="w-8 h-8 text-gray-400" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Online</p>
                            <p className="text-3xl font-bold text-green-600">{stats.online}</p>
                        </div>
                        <Wifi className="w-8 h-8 text-green-400" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Offline</p>
                            <p className="text-3xl font-bold text-red-600">{stats.offline}</p>
                        </div>
                        <WifiOff className="w-8 h-8 text-red-400" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Maintenance</p>
                            <p className="text-3xl font-bold text-yellow-600">{stats.maintenance}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-400" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Errors</p>
                            <p className="text-3xl font-bold text-red-600">{stats.error}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search devices..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => setFilterStatus(null)}
                            className={cn(
                                "px-3 py-2 text-sm rounded-md",
                                filterStatus === null
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterStatus('ONLINE')}
                            className={cn(
                                "px-3 py-2 text-sm rounded-md",
                                filterStatus === 'ONLINE'
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            )}
                        >
                            Online
                        </button>
                        <button
                            onClick={() => setFilterStatus('OFFLINE')}
                            className={cn(
                                "px-3 py-2 text-sm rounded-md",
                                filterStatus === 'OFFLINE'
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            )}
                        >
                            Offline
                        </button>
                        <button
                            onClick={fetchDevices}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 flex items-center"
                        >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="mt-2 text-sm text-gray-500">
                    Last updated: {lastUpdate.toLocaleTimeString()} •
                    Showing {filteredDevices.length} of {devices.length} devices
                    {isDevelopment() && (
                        <span className="ml-2 text-blue-600">
                            • Auto-refresh: {refreshInterval / 1000}s
                        </span>
                    )}
                </div>
            </div>

            {/* Device Grid */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                        <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                        <p className="text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {filteredDevices.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredDevices.map((device) => (
                        <Link
                            key={device.id}
                            href={`/devices/${device.id}`}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            {/* Device Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    {getStatusIcon(device.status)}
                                    <div className="ml-3">
                                        <h3 className="text-lg font-semibold text-gray-900">{device.hostname}</h3>
                                        <p className="text-sm text-gray-500">{device.deviceType} {device.deviceModel ? `• ${device.deviceModel}` : ''}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(device.status)}`}>
                    {device.status}
                  </span>
                                    {device.alertCount > 0 && (
                                        <span className="mt-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                      {device.alertCount} alerts
                    </span>
                                    )}
                                </div>
                            </div>

                            {/* Device Info */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Location:</span>
                                    <span className="text-gray-900">{device.location || 'Unknown'}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">IP Address:</span>
                                    <span className="text-gray-900 font-mono text-xs">
                    {device.tailscaleIp || device.ipAddress || 'Unknown'}
                  </span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Last Seen:</span>
                                    <span className="text-gray-900">{formatTimeAgo(device.lastSeen)}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Uptime:</span>
                                    <span className="text-gray-900">{formatUptime(device.uptime)}</span>
                                </div>
                            </div>

                            {/* Metrics */}
                            {device.status === 'ONLINE' && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center">
                                            <Cpu className="w-4 h-4 text-blue-500 mr-2" />
                                            <div>
                                                <p className="text-xs text-gray-500">CPU</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {device.cpuUsage?.toFixed(1) || '0'}%
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <Thermometer className="w-4 h-4 text-red-500 mr-2" />
                                            <div>
                                                <p className="text-xs text-gray-500">Temp</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {device.cpuTemp?.toFixed(1) || '0'}°C
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                    <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                    <p className="text-gray-500">
                        {searchTerm || filterStatus
                            ? 'Try adjusting your search or filters.'
                            : 'Start by registering your first IoT device using the device agent installer.'}
                    </p>
                </div>
            )}
        </div>
    );
}