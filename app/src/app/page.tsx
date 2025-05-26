'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Thermometer, Cpu, HardDrive, AlertTriangle, Wifi, WifiOff, Clock } from 'lucide-react';

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

interface DashboardStats {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    error: number;
}

export default function Dashboard() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [stats, setStats] = useState<DashboardStats>({ total: 0, online: 0, offline: 0, maintenance: 0, error: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        fetchDevices();

        // Refresh data every 30 seconds
        const interval = setInterval(fetchDevices, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDevices = async () => {
        try {
            const response = await fetch('/api/devices');
            if (!response.ok) throw new Error('Failed to fetch devices');

            const data = await response.json();
            setDevices(data.devices);
            setStats(data.stats);
            setLastUpdate(new Date());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ONLINE': return <Wifi className="w-5 h-5 text-green-500" />;
            case 'OFFLINE': return <WifiOff className="w-5 h-5 text-red-500" />;
            case 'MAINTENANCE': return <Clock className="w-5 h-5 text-yellow-500" />;
            case 'ERROR': return <AlertTriangle className="w-5 h-5 text-red-600" />;
            default: return <WifiOff className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ONLINE': return 'bg-green-100 text-green-800 border-green-200';
            case 'OFFLINE': return 'bg-red-100 text-red-800 border-red-200';
            case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'ERROR': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatUptime = (uptime?: string) => {
        if (!uptime) return 'Unknown';
        return uptime.replace('up ', '');
    };

    const formatLastSeen = (lastSeen?: string) => {
        if (!lastSeen) return 'Never';
        const date = new Date(lastSeen);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading devices...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Server className="w-8 h-8 text-blue-600 mr-3" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">IoT Pilot</h1>
                                <p className="text-sm text-gray-500">Device Management Dashboard</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Last updated</p>
                            <p className="text-sm font-medium text-gray-900">{lastUpdate.toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                            <p className="text-red-800">{error}</p>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <Server className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Online</p>
                                <p className="text-3xl font-bold text-green-600">{stats.online}</p>
                            </div>
                            <Wifi className="w-8 h-8 text-green-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Offline</p>
                                <p className="text-3xl font-bold text-red-600">{stats.offline}</p>
                            </div>
                            <WifiOff className="w-8 h-8 text-red-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Maintenance</p>
                                <p className="text-3xl font-bold text-yellow-600">{stats.maintenance}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Errors</p>
                                <p className="text-3xl font-bold text-red-600">{stats.error}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                    </div>
                </div>

                {/* Devices Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {devices.map((device) => (
                        <div key={device.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            {/* Device Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    {getStatusIcon(device.status)}
                                    <div className="ml-3">
                                        <h3 className="text-lg font-semibold text-gray-900">{device.hostname}</h3>
                                        <p className="text-sm text-gray-500">{device.deviceType} • {device.deviceModel}</p>
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
                                    <span className="text-gray-900">{formatLastSeen(device.lastSeen)}</span>
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
                                            <Activity className="w-4 h-4 text-green-500 mr-2" />
                                            <div>
                                                <p className="text-xs text-gray-500">Memory</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {device.memoryUsage?.toFixed(1) || '0'}%
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

                                        <div className="flex items-center">
                                            <HardDrive className="w-4 h-4 text-purple-500 mr-2" />
                                            <div>
                                                <p className="text-xs text-gray-500">Disk</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {device.diskUsage?.toFixed(1) || '0'}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {devices.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                        <p className="text-gray-500">
                            Start by registering your first IoT device using the device agent installer.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}