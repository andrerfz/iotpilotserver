
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Filter,
    Eye,
    TrendingUp,
    Settings,
    RefreshCw,
    Bell,
    Activity
} from 'lucide-react';
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    Select,
    SelectItem,
    Textarea,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Tabs,
    Tab,
    Badge,
    Progress
} from '@heroui/react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface DeviceAlertsPageProps {
    params: {
        id: string;
    };
}

interface DeviceInfo {
    id: string;
    deviceId: string;
    hostname: string;
    status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';
    ipAddress?: string;
}

interface Alert {
    id: string;
    deviceId: string;
    type: 'DEVICE_OFFLINE' | 'HIGH_CPU' | 'HIGH_MEMORY' | 'HIGH_TEMPERATURE' | 'LOW_DISK_SPACE' | 'APPLICATION_ERROR' | 'SYSTEM_ERROR' | 'SECURITY_ALERT' | 'CUSTOM';
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    title: string;
    message: string;
    source?: string;
    resolved: boolean;
    resolvedAt?: string;
    acknowledgedAt?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}

interface AlertConfig {
    cpuThreshold: number;
    memoryThreshold: number;
    temperatureThreshold: number;
    diskThreshold: number;
    enableEmailNotifications: boolean;
    enablePushNotifications: boolean;
    alertTypes: Record<string, boolean>;
}

const ALERT_TYPES = [
    {
        key: 'DEVICE_OFFLINE',
        label: 'Device Offline',
        description: 'When device stops sending heartbeats'
    },
    {
        key: 'HIGH_CPU',
        label: 'High CPU Usage',
        description: 'CPU usage exceeds threshold'
    },
    {
        key: 'HIGH_MEMORY',
        label: 'High Memory Usage',
        description: 'Memory usage exceeds threshold'
    },
    {
        key: 'HIGH_TEMPERATURE',
        label: 'High Temperature',
        description: 'Temperature exceeds safe limits'
    },
    {
        key: 'LOW_DISK_SPACE',
        label: 'Low Disk Space',
        description: 'Disk usage exceeds threshold'
    },
    {
        key: 'APPLICATION_ERROR',
        label: 'Application Error',
        description: 'IoT application errors'
    },
    {
        key: 'SYSTEM_ERROR',
        label: 'System Error',
        description: 'System-level errors'
    },
    {
        key: 'SECURITY_ALERT',
        label: 'Security Alert',
        description: 'Security-related events'
    }
];

const SEVERITY_CONFIG = {
    INFO: {
        color: 'primary' as const,
        icon: Clock
    },
    WARNING: {
        color: 'warning' as const,
        icon: AlertTriangle
    },
    ERROR: {
        color: 'danger' as const,
        icon: XCircle
    },
    CRITICAL: {
        color: 'danger' as const,
        icon: XCircle
    }
};

export default function DeviceAlertsPage({ params }: DeviceAlertsPageProps) {
    const router = useRouter();
    const {
        isOpen,
        onOpen,
        onOpenChange
    } = useDisclosure();
    const {
        isOpen: isConfigOpen,
        onOpen: onConfigOpen,
        onOpenChange: onConfigOpenChange
    } = useDisclosure();

    const [device, setDevice] = useState<DeviceInfo | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
    const [alertConfig, setAlertConfig] = useState<AlertConfig>({
        cpuThreshold: 80,
        memoryThreshold: 85,
        temperatureThreshold: 70,
        diskThreshold: 90,
        enableEmailNotifications: true,
        enablePushNotifications: false,
        alertTypes: {}
    });

    const [loading, setLoading] = useState(true);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

    // Filters
    const [severityFilter, setSeverityFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Resolve alert
    const [resolveNote, setResolveNote] = useState('');
    const [resolvingAlert, setResolvingAlert] = useState<string | null>(null);

    // Analytics data
    const [alertStats, setAlertStats] = useState({
        total: 0,
        active: 0,
        resolved: 0,
        critical: 0
    });

    // Load alert configuration
    const loadAlertConfig = async () => {
        try {
            const response = await fetch(`/api/devices/${params.id}/alerts/config`);
            if (response.ok) {
                const config = await response.json();
                setAlertConfig({
                    cpuThreshold: config.thresholds?.cpu?.warning || 80,
                    memoryThreshold: config.thresholds?.memory?.warning || 85,
                    temperatureThreshold: config.thresholds?.temperature?.warning || 70,
                    diskThreshold: config.thresholds?.disk?.warning || 90,
                    enableEmailNotifications: config.notifications?.email || true,
                    enablePushNotifications: config.notifications?.push || false,
                    alertTypes: config.alertTypes || {}
                });
            }
        } catch (err) {
            console.error('Failed to load alert configuration:', err);
        }
    };

    // Fetch device info
    useEffect(() => {
        async function fetchDeviceInfo() {
            try {
                setLoading(true);
                const response = await fetch(`/api/devices/${params.id}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch device info');
                }

                const data = await response.json();
                setDevice(data);
            } catch (err) {
                toast.error('Failed to load device information');
                router.push('/devices');
            } finally {
                setLoading(false);
            }
        }

        fetchDeviceInfo();
    }, [params.id, router]);

    // Load alerts and configuration when device is loaded
    useEffect(() => {
        if (device) {
            fetchAlerts();
            loadAlertConfig();
        }
    }, [device, params.id]);

    // Fetch alerts
    const fetchAlerts = async () => {
        try {
            setAlertsLoading(true);
            const response = await fetch(`/api/devices/${params.id}/alerts`);

            if (!response.ok) {
                if (response.status === 404) {
                    // API not implemented yet, use mock data
                    setAlerts(generateMockAlerts());
                    return;
                }
                throw new Error('Failed to fetch alerts');
            }

            const data = await response.json();
            setAlerts(data.alerts || []);
        } catch (err) {
            // For demo purposes, use mock data
            setAlerts(generateMockAlerts());
        } finally {
            setAlertsLoading(false);
        }
    };

    // Generate enhanced mock alerts
    const generateMockAlerts = (): Alert[] => {
        if (!device) return [];

        const now = new Date();
        const mockAlerts: Alert[] = [
            {
                id: '1',
                deviceId: device.id,
                type: 'HIGH_CPU',
                severity: 'WARNING',
                title: 'High CPU Usage',
                message: 'CPU usage has exceeded 85% for the past 5 minutes. Current usage: 92%',
                resolved: false,
                createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                metadata: {
                    threshold: 85,
                    currentValue: 92,
                    duration: '5 minutes',
                    process: 'node-exporter'
                }
            },
            {
                id: '2',
                deviceId: device.id,
                type: 'HIGH_TEMPERATURE',
                severity: 'CRITICAL',
                title: 'Critical Temperature',
                message: 'Device temperature has reached 78°C, approaching thermal throttling limits',
                resolved: true,
                resolvedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                metadata: {
                    threshold: 70,
                    currentValue: 78,
                    location: 'CPU Core',
                    coolingAction: 'Fan speed increased'
                }
            },
            {
                id: '3',
                deviceId: device.id,
                type: 'LOW_DISK_SPACE',
                severity: 'WARNING',
                title: 'Low Disk Space',
                message: 'Root partition disk usage is at 92%. Only 2.1GB remaining.',
                resolved: false,
                createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
                metadata: {
                    threshold: 90,
                    currentValue: 92,
                    partition: '/dev/sda1',
                    availableSpace: '2.1 GB',
                    totalSpace: '32 GB'
                }
            },
            {
                id: '4',
                deviceId: device.id,
                type: 'DEVICE_OFFLINE',
                severity: 'ERROR',
                title: 'Device Offline',
                message: 'Device has been offline for 15 minutes. Last heartbeat received at 14:32.',
                resolved: true,
                resolvedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                metadata: {
                    lastSeen: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
                    reason: 'Network timeout',
                    recoveryTime: '2 minutes'
                }
            },
            {
                id: '5',
                deviceId: device.id,
                type: 'HIGH_MEMORY',
                severity: 'WARNING',
                title: 'High Memory Usage',
                message: 'Memory usage is at 87%. Available memory: 1.04GB of 8GB total.',
                resolved: false,
                createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
                metadata: {
                    threshold: 85,
                    currentValue: 87,
                    totalMemory: '8 GB',
                    availableMemory: '1.04 GB',
                    topProcess: 'docker containers'
                }
            },
            {
                id: '6',
                deviceId: device.id,
                type: 'SECURITY_ALERT',
                severity: 'CRITICAL',
                title: 'Failed Login Attempts',
                message: 'Multiple failed SSH login attempts detected from external IPs',
                resolved: false,
                createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                metadata: {
                    attempts: 15,
                    sourceIPs: ['192.168.1.100', '10.0.0.50', '203.45.67.89'],
                    timeWindow: '10 minutes',
                    lastAttempt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
                    blocked: true
                }
            }
        ];

        return mockAlerts;
    };

    // Filter alerts
    useEffect(() => {
        let filtered = alerts;

        if (severityFilter) {
            filtered = filtered.filter(alert => alert.severity === severityFilter);
        }

        if (statusFilter === 'active') {
            filtered = filtered.filter(alert => !alert.resolved);
        } else if (statusFilter === 'resolved') {
            filtered = filtered.filter(alert => alert.resolved);
        } else if (statusFilter === 'acknowledged') {
            filtered = filtered.filter(alert => alert.acknowledgedAt && !alert.resolved);
        }

        if (typeFilter) {
            filtered = filtered.filter(alert => alert.type === typeFilter);
        }

        if (searchQuery) {
            filtered = filtered.filter(alert =>
                alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                alert.message.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredAlerts(filtered);
    }, [alerts, severityFilter, statusFilter, typeFilter, searchQuery]);

    // Calculate stats
    useEffect(() => {
        setAlertStats({
            total: alerts.length,
            active: alerts.filter(a => !a.resolved).length,
            resolved: alerts.filter(a => a.resolved).length,
            critical: alerts.filter(a => a.severity === 'CRITICAL' && !a.resolved).length
        });
    }, [alerts]);

    // Acknowledge alert
    const handleAcknowledgeAlert = async (alertId: string) => {
        try {
            const response = await fetch(`/api/devices/${params.id}/alerts/${alertId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'acknowledge' })
            });

            if (!response.ok) {
                throw new Error('Failed to acknowledge alert');
            }

            setAlerts(prev => prev.map(alert =>
                alert.id === alertId
                    ? { ...alert, acknowledgedAt: new Date().toISOString() }
                    : alert
            ));

            toast.success('Alert acknowledged successfully');
        } catch (err) {
            toast.error('Failed to acknowledge alert');
        }
    };

    // Resolve alert
    const handleResolveAlert = async (alertId: string) => {
        try {
            setResolvingAlert(alertId);

            const response = await fetch(`/api/devices/${params.id}/alerts/${alertId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'resolve',
                    note: resolveNote || 'Resolved via web interface',
                    resolvedBy: 'user'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to resolve alert');
            }

            setAlerts(prev => prev.map(alert =>
                alert.id === alertId
                    ? {
                        ...alert,
                        resolved: true,
                        resolvedAt: new Date().toISOString()
                    }
                    : alert
            ));

            toast.success('Alert resolved successfully');
            setSelectedAlert(null);
            onOpenChange();

        } catch (err) {
            toast.error('Failed to resolve alert');
        } finally {
            setResolvingAlert(null);
            setResolveNote('');
        }
    };

    const handleAlertDetail = (alert: Alert) => {
        setSelectedAlert(alert);
        onOpen();
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        return 'Just now';
    };

    // Generate chart data for analytics
    const generateChartData = () => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return {
                date: date.toLocaleDateString(),
                alerts: Math.floor(Math.random() * 5) + 1
            };
        });
        return last7Days;
    };

    const generateTypeData = () => {
        const typeCounts = ALERT_TYPES.map(type => ({
            type: type.label,
            count: alerts.filter(alert => alert.type === type.key).length
        })).filter(item => item.count > 0);

        return typeCounts;
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div
                            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-default-500">Loading device alerts...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!device) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Device not found</h1>
                    <Button onClick={() => router.push('/devices')} color="primary">
                        Back to Devices
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Button
                        onClick={() => router.push(`/devices/${params.id}`)}
                        variant="light"
                        size="sm"
                        startContent={<ArrowLeft className="w-4 h-4" />}
                        className="mr-4"
                    >
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center">
                            <AlertTriangle className="w-6 h-6 mr-2" />
                            Alerts - {device.hostname}
                        </h1>
                        <p className="text-default-500 text-sm">
                            {device.deviceId} • {device.ipAddress}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={onConfigOpen}
                        variant="bordered"
                        size="sm"
                        startContent={<Settings className="w-4 h-4" />}
                    >
                        Configure
                    </Button>
                    <Button
                        onClick={fetchAlerts}
                        variant="bordered"
                        size="sm"
                        startContent={<RefreshCw className="w-4 h-4" />}
                        isLoading={alertsLoading}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardBody className="text-center">
                        <div className="text-2xl font-bold text-primary">{alertStats.total}</div>
                        <div className="text-sm text-default-500">Total Alerts</div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="text-center">
                        <div className="text-2xl font-bold text-warning">{alertStats.active}</div>
                        <div className="text-sm text-default-500">Active Alerts</div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="text-center">
                        <div className="text-2xl font-bold text-success">{alertStats.resolved}</div>
                        <div className="text-sm text-default-500">Resolved</div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="text-center">
                        <div className="text-2xl font-bold text-danger">{alertStats.critical}</div>
                        <div className="text-sm text-default-500">Critical</div>
                    </CardBody>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs aria-label="Alert Management" className="w-full">
                <Tab
                    key="alerts"
                    title={
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Alert History
                            {alertStats.active > 0 && (
                                <Badge color="danger" size="sm">
                                    {alertStats.active}
                                </Badge>
                            )}
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {/* Filters */}
                        <Card>
                            <CardBody>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <Input
                                        placeholder="Search alerts..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        startContent={<Filter className="w-4 h-4" />}
                                    />
                                    <Select
                                        placeholder="Severity"
                                        selectedKeys={severityFilter ? [severityFilter] : []}
                                        onSelectionChange={(keys) => {
                                            const key = Array.from(keys)[0] as string;
                                            setSeverityFilter(key === 'all' ? '' : key || '');
                                        }}
                                    >
                                        <SelectItem key="all">All Severities</SelectItem>
                                        <SelectItem key="INFO">Info</SelectItem>
                                        <SelectItem key="WARNING">Warning</SelectItem>
                                        <SelectItem key="ERROR">Error</SelectItem>
                                        <SelectItem key="CRITICAL">Critical</SelectItem>
                                    </Select>
                                    <Select
                                        placeholder="Status"
                                        selectedKeys={statusFilter ? [statusFilter] : []}
                                        onSelectionChange={(keys) => {
                                            const key = Array.from(keys)[0] as string;
                                            setStatusFilter(key === 'all' ? '' : key || '');
                                        }}
                                    >
                                        <SelectItem key="all">All Statuses</SelectItem>
                                        <SelectItem key="active">Active</SelectItem>
                                        <SelectItem key="acknowledged">Acknowledged</SelectItem>
                                        <SelectItem key="resolved">Resolved</SelectItem>
                                    </Select>
                                    <Select
                                        placeholder="Type"
                                        selectedKeys={typeFilter ? [typeFilter] : []}
                                        onSelectionChange={(keys) => {
                                            const key = Array.from(keys)[0] as string;
                                            setTypeFilter(key === 'all' ? '' : key || '');
                                        }}
                                    >
                                        {[
                                            { key: "all", label: "All Types" },
                                            ...ALERT_TYPES
                                        ].map(type => (
                                            <SelectItem key={type.key}>{type.label}</SelectItem>
                                        ))}
                                    </Select>
                                    <Button
                                        variant="bordered"
                                        onClick={() => {
                                            setSeverityFilter('');
                                            setStatusFilter('');
                                            setTypeFilter('');
                                            setSearchQuery('');
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </Tab>

                <Tab
                    key="analytics"
                    title={
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Analytics
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Alert Trend */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Alert Trend (Last 7 Days)</h3>
                            </CardHeader>
                            <CardBody>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={generateChartData()}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="alerts" stroke="#0070f3" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardBody>
                        </Card>

                        {/* Alert Types */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Alert Types Distribution</h3>
                            </CardHeader>
                            <CardBody>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={generateTypeData()}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="type" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#0070f3" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardBody>
                        </Card>
                    </div>
                </Tab>
            </Tabs>

            {/* Alert Detail Modal */}
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Alert Details
                            </ModalHeader>
                            <ModalBody>
                                {selectedAlert && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`p-3 rounded-full bg-${SEVERITY_CONFIG[selectedAlert.severity].color}-100`}>
                                                {(() => {
                                                    const IconComponent = SEVERITY_CONFIG[selectedAlert.severity].icon;
                                                    return <IconComponent
                                                        className={`w-6 h-6 text-${SEVERITY_CONFIG[selectedAlert.severity].color}-600`} />;
                                                })()}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold">{selectedAlert.title}</h3>
                                                <div className="flex items-center gap-2">
                                                    <Chip
                                                        color={SEVERITY_CONFIG[selectedAlert.severity].color}
                                                        variant="flat"
                                                    >
                                                        {selectedAlert.severity}
                                                    </Chip>
                                                    <Chip
                                                        color={selectedAlert.resolved ? 'success' : selectedAlert.acknowledgedAt ? 'warning' : 'danger'}
                                                        variant="flat"
                                                    >
                                                        {selectedAlert.resolved ? 'Resolved' : selectedAlert.acknowledgedAt ? 'Acknowledged' : 'Active'}
                                                    </Chip>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2">Message</h4>
                                            <p className="text-default-600">{selectedAlert.message}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="font-medium mb-1">Created</h4>
                                                <p className="text-sm text-default-600">{formatDateTime(selectedAlert.createdAt)}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-medium mb-1">Type</h4>
                                                <p className="text-sm text-default-600 capitalize">
                                                    {selectedAlert.type.toLowerCase().replace('_', ' ')}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedAlert.acknowledgedAt && (
                                            <div>
                                                <h4 className="font-medium mb-1">Acknowledged At</h4>
                                                <p className="text-sm text-default-600">{formatDateTime(selectedAlert.acknowledgedAt)}</p>
                                            </div>
                                        )}

                                        {selectedAlert.resolved && selectedAlert.resolvedAt && (
                                            <div>
                                                <h4 className="font-medium mb-1">Resolved At</h4>
                                                <p className="text-sm text-default-600">{formatDateTime(selectedAlert.resolvedAt)}</p>
                                            </div>
                                        )}

                                        {selectedAlert.metadata && (
                                            <div>
                                                <h4 className="font-medium mb-2">Additional Information</h4>
                                                <div className="bg-default-100 p-3 rounded-lg">
                                                    <pre
                                                        className="text-sm">{JSON.stringify(selectedAlert.metadata, null, 2)}</pre>
                                                </div>
                                            </div>
                                        )}

                                        {!selectedAlert.resolved && (
                                            <div>
                                                <h4 className="font-medium mb-2">Resolution Notes</h4>
                                                <Textarea
                                                    placeholder="Add notes about how this alert was resolved..."
                                                    value={resolveNote}
                                                    onChange={(e) => setResolveNote(e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>
                                    Close
                                </Button>
                                {selectedAlert && !selectedAlert.resolved && (
                                    <>
                                        {!selectedAlert.acknowledgedAt && (
                                            <Button
                                                color="warning"
                                                variant="bordered"
                                                onPress={() => {
                                                    handleAcknowledgeAlert(selectedAlert.id);
                                                    onClose();
                                                }}
                                                startContent={<CheckCircle className="w-4 h-4" />}
                                            >
                                                Acknowledge
                                            </Button>
                                        )}
                                        <Button
                                            color="success"
                                            onPress={() => handleResolveAlert(selectedAlert.id)}
                                            isLoading={resolvingAlert === selectedAlert.id}
                                            startContent={<CheckCircle className="w-4 h-4" />}
                                        >
                                            Resolve Alert
                                        </Button>
                                    </>
                                )}
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Alert Configuration Modal */}
            <Modal
                isOpen={isConfigOpen}
                onOpenChange={onConfigOpenChange}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>
                                Alert Configuration
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-medium mb-4">Alert Thresholds</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">
                                                    CPU Warning Threshold (%)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={alertConfig.cpuThreshold.toString()}
                                                    onChange={(e) => setAlertConfig(prev => ({
                                                        ...prev,
                                                        cpuThreshold: parseInt(e.target.value) || 80
                                                    }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">
                                                    Memory Warning Threshold (%)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={alertConfig.memoryThreshold.toString()}
                                                    onChange={(e) => setAlertConfig(prev => ({
                                                        ...prev,
                                                        memoryThreshold: parseInt(e.target.value) || 85
                                                    }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">
                                                    Temperature Warning Threshold (°C)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="150"
                                                    value={alertConfig.temperatureThreshold.toString()}
                                                    onChange={(e) => setAlertConfig(prev => ({
                                                        ...prev,
                                                        temperatureThreshold: parseInt(e.target.value) || 70
                                                    }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">
                                                    Disk Warning Threshold (%)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={alertConfig.diskThreshold.toString()}
                                                    onChange={(e) => setAlertConfig(prev => ({
                                                        ...prev,
                                                        diskThreshold: parseInt(e.target.value) || 90
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-4">Notification Settings</h4>
                                        <div className="space-y-3">
                                            <div
                                                className="flex items-center justify-between p-3 border border-default-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Bell className="w-4 h-4" />
                                                    <div>
                                                        <div className="font-medium">Email Notifications</div>
                                                        <div className="text-sm text-default-500">Receive alerts via
                                                            email
                                                        </div>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={alertConfig.enableEmailNotifications}
                                                        onChange={(e) => setAlertConfig(prev => ({
                                                            ...prev,
                                                            enableEmailNotifications: e.target.checked
                                                        }))}
                                                        className="sr-only peer"
                                                    />
                                                    <div
                                                        className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>
                                            <div
                                                className="flex items-center justify-between p-3 border border-default-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Activity className="w-4 h-4" />
                                                    <div>
                                                        <div className="font-medium">Push Notifications</div>
                                                        <div className="text-sm text-default-500">Receive real-time push
                                                            notifications
                                                        </div>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={alertConfig.enablePushNotifications}
                                                        onChange={(e) => setAlertConfig(prev => ({
                                                            ...prev,
                                                            enablePushNotifications: e.target.checked
                                                        }))}
                                                        className="sr-only peer"
                                                    />
                                                    <div
                                                        className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-4">Alert Types</h4>
                                        <div className="space-y-3">
                                            {ALERT_TYPES.map((alertType) => (
                                                <div key={alertType.key}
                                                     className="flex items-center justify-between p-3 border border-default-200 rounded-lg">
                                                    <div>
                                                        <h5 className="font-medium">{alertType.label}</h5>
                                                        <p className="text-sm text-default-500">{alertType.description}</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={alertConfig.alertTypes[alertType.key] !== false}
                                                            onChange={(e) => setAlertConfig(prev => ({
                                                                ...prev,
                                                                alertTypes: {
                                                                    ...prev.alertTypes,
                                                                    [alertType.key]: e.target.checked
                                                                }
                                                            }))}
                                                            className="sr-only peer"
                                                        />
                                                        <div
                                                            className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-4">Test Alerts</h4>
                                        <p className="text-sm text-default-500 mb-4">
                                            Send test alerts to verify your configuration is working correctly.
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="bordered"
                                                size="sm"
                                                onClick={async () => {
                                                    try {
                                                        const response = await fetch(`/api/devices/${params.id}/alerts`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                type: 'CUSTOM',
                                                                severity: 'INFO',
                                                                title: 'Test Alert',
                                                                message: 'This is a test alert to verify your configuration.',
                                                                metadata: { test: true }
                                                            })
                                                        });

                                                        if (response.ok) {
                                                            toast.success('Test alert sent successfully');
                                                            fetchAlerts();
                                                        } else {
                                                            throw new Error('Failed to send test alert');
                                                        }
                                                    } catch (err) {
                                                        toast.error('Failed to send test alert');
                                                    }
                                                }}
                                            >
                                                Send Test Alert
                                            </Button>
                                            <Button
                                                variant="bordered"
                                                size="sm"
                                                color="warning"
                                                onClick={async () => {
                                                    try {
                                                        const response = await fetch(`/api/devices/${params.id}/alerts`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                type: 'CUSTOM',
                                                                severity: 'CRITICAL',
                                                                title: 'Critical Test Alert',
                                                                message: 'This is a critical test alert to verify emergency notifications.',
                                                                metadata: {
                                                                    test: true,
                                                                    critical: true
                                                                }
                                                            })
                                                        });

                                                        if (response.ok) {
                                                            toast.success('Critical test alert sent');
                                                            fetchAlerts();
                                                        } else {
                                                            throw new Error('Failed to send critical test alert');
                                                        }
                                                    } catch (err) {
                                                        toast.error('Failed to send critical test alert');
                                                    }
                                                }}
                                            >
                                                Send Critical Test
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={() => onConfigOpenChange()}>
                                    Cancel
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={async () => {
                                        try {
                                            const response = await fetch(`/api/devices/${params.id}/alerts/config`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    thresholds: {
                                                        cpu: {
                                                            warning: alertConfig.cpuThreshold,
                                                            critical: alertConfig.cpuThreshold + 10,
                                                            enabled: alertConfig.alertTypes['HIGH_CPU'] !== false
                                                        },
                                                        memory: {
                                                            warning: alertConfig.memoryThreshold,
                                                            critical: alertConfig.memoryThreshold + 10,
                                                            enabled: alertConfig.alertTypes['HIGH_MEMORY'] !== false
                                                        },
                                                        temperature: {
                                                            warning: alertConfig.temperatureThreshold,
                                                            critical: alertConfig.temperatureThreshold + 15,
                                                            enabled: alertConfig.alertTypes['HIGH_TEMPERATURE'] !== false
                                                        },
                                                        disk: {
                                                            warning: alertConfig.diskThreshold,
                                                            critical: alertConfig.diskThreshold + 5,
                                                            enabled: alertConfig.alertTypes['LOW_DISK_SPACE'] !== false
                                                        },
                                                    },
                                                    notifications: {
                                                        email: alertConfig.enableEmailNotifications,
                                                        push: alertConfig.enablePushNotifications,
                                                    },
                                                    alertTypes: alertConfig.alertTypes
                                                })
                                            });

                                            if (response.ok) {
                                                toast.success('Alert configuration saved successfully');
                                                onConfigOpenChange();
                                            } else {
                                                throw new Error('Failed to save configuration');
                                            }
                                        } catch (err) {
                                            toast.error('Failed to save alert configuration');
                                        }
                                    }}
                                >
                                    Save Configuration
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}