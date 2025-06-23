'use client';

import { useState, useEffect } from 'react';
import { 
  Cpu, 
  Database, 
  Server, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  HardDrive,
  Users,
  Bell
} from 'lucide-react';
import { Card } from '@heroui/card';
import { Button } from '@heroui/button';
import { Progress } from '@heroui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@heroui/table';

// System health types
interface SystemHealth {
  system: {
    cpu: {
      cores: number;
      model: string;
      loadAvg: number[];
      utilization: number;
    };
    memory: {
      total: number;
      free: number;
      used: number;
      usedPercentage: number;
    };
    uptime: number;
    platform: string;
    hostname: string;
    timestamp: string;
  };
  database: {
    counts: {
      users: number;
      devices: number;
      alerts: number;
      customers: number;
    };
    recentActivity: Array<{
      id: string;
      hostname: string;
      updatedAt: string;
    }>;
    status: string;
    error?: string;
  };
  application: {
    status: string;
    version: string;
    nodeVersion: string;
    environment: string;
    features: {
      multiTenant: boolean;
      advancedMetrics: boolean;
      tailscale: boolean;
    };
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    uptime: number;
    error?: string;
  };
}

export default function SystemHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Format bytes to human-readable format
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format seconds to human-readable duration
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${days}d ${hours}h ${minutes}m`;
  };

  // Fetch system health
  const fetchSystemHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/system');

      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }

      const data = await response.json();
      setHealth(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Error loading system health. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSystemHealth();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSystemHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Get status indicator
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-1" /> Healthy</span>;
      case 'warning':
        return <span className="flex items-center text-amber-600"><AlertTriangle className="w-4 h-4 mr-1" /> Warning</span>;
      case 'error':
        return <span className="flex items-center text-red-600"><XCircle className="w-4 h-4 mr-1" /> Error</span>;
      default:
        return <span className="flex items-center text-gray-600">Unknown</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Health</h1>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchSystemHealth} variant="flat" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {loading && !health ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p>Loading system health data...</p>
        </div>
      ) : health ? (
        <div className="space-y-6">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Server className="mr-2 h-5 w-5 text-blue-600" />
                  System
                </h3>
                {getStatusIndicator('healthy')}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Hostname</p>
                  <p className="font-medium">{health.system.hostname}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Platform</p>
                  <p className="font-medium">{health.system.platform}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Uptime</p>
                  <p className="font-medium">{formatUptime(health.system.uptime)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Database className="mr-2 h-5 w-5 text-green-600" />
                  Database
                </h3>
                {getStatusIndicator(health.database.status)}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Users</p>
                    <p className="font-medium">{health.database.counts.users}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Devices</p>
                    <p className="font-medium">{health.database.counts.devices}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Alerts</p>
                    <p className="font-medium">{health.database.counts.alerts}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Customers</p>
                    <p className="font-medium">{health.database.counts.customers}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Cpu className="mr-2 h-5 w-5 text-purple-600" />
                  Application
                </h3>
                {getStatusIndicator(health.application.status)}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Version</p>
                  <p className="font-medium">{health.application.version}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Node.js</p>
                  <p className="font-medium">{health.application.nodeVersion}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Environment</p>
                  <p className="font-medium">{health.application.environment}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Resource Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 shadow-md">
              <h3 className="text-lg font-semibold flex items-center mb-4">
                <Cpu className="mr-2 h-5 w-5 text-blue-600" />
                CPU Usage
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-500">Utilization</span>
                    <span className="text-sm font-medium">{health.system.cpu.utilization}%</span>
                  </div>
                  <Progress value={health.system.cpu.utilization} className="h-2" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">CPU Model</p>
                  <p className="text-sm">{health.system.cpu.model}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Cores</p>
                    <p className="font-medium">{health.system.cpu.cores}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Load (1m)</p>
                    <p className="font-medium">{health.system.cpu.loadAvg[0].toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Load (5m)</p>
                    <p className="font-medium">{health.system.cpu.loadAvg[1].toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-md">
              <h3 className="text-lg font-semibold flex items-center mb-4">
                <HardDrive className="mr-2 h-5 w-5 text-green-600" />
                Memory Usage
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-500">Used Memory</span>
                    <span className="text-sm font-medium">{health.system.memory.usedPercentage}%</span>
                  </div>
                  <Progress value={health.system.memory.usedPercentage} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total</p>
                    <p className="font-medium">{formatBytes(health.system.memory.total)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Used</p>
                    <p className="font-medium">{formatBytes(health.system.memory.used)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Free</p>
                    <p className="font-medium">{formatBytes(health.system.memory.free)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Heap Usage</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Used: {formatBytes(health.application.memory.heapUsed)}</span>
                    <span>Total: {formatBytes(health.application.memory.heapTotal)}</span>
                  </div>
                  <Progress 
                    value={(health.application.memory.heapUsed / health.application.memory.heapTotal) * 100} 
                    className="h-1 mt-1" 
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="p-6 shadow-md">
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <Clock className="mr-2 h-5 w-5 text-blue-600" />
              Recent Activity
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell as="th">Device</TableCell>
                  <TableCell as="th">Last Updated</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {health.database.recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4 text-gray-500">
                      No recent activity
                    </TableCell>
                  </TableRow>
                ) : (
                  health.database.recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.hostname}</TableCell>
                      <TableCell>{new Date(activity.updatedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Feature Status */}
          <Card className="p-6 shadow-md">
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <Server className="mr-2 h-5 w-5 text-purple-600" />
              Platform Features
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <div className={`w-3 h-3 rounded-full mr-2 ${health.application.features.multiTenant ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="font-medium">Multi-Tenant</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <div className={`w-3 h-3 rounded-full mr-2 ${health.application.features.advancedMetrics ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="font-medium">Advanced Metrics</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <div className={`w-3 h-3 rounded-full mr-2 ${health.application.features.tailscale ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="font-medium">Tailscale</span>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
