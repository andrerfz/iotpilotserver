'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    AlertTriangle,
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
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Tabs,
    Tab,
    Badge,
    Input,
    Textarea
} from '@heroui/react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Import the existing components and shared types
import { AlertCard } from '@/components/alerts/AlertCard';
import { AlertFilters } from '@/components/alerts/AlertFilters';
import { AlertStats } from '@/components/alerts/AlertStats';
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts';
import { Alert, AlertConfig, AlertStats as AlertStatsType, ALERT_TYPES } from '@/types/alerts';

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

export default function DeviceAlertsPage({ params }: DeviceAlertsPageProps) {
    const router = useRouter();
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { isOpen: isConfigOpen, onOpen: onConfigOpen, onOpenChange: onConfigOpenChange } = useDisclosure();

    const [device, setDevice] = useState<DeviceInfo | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [loading, setLoading] = useState(true);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [resolveNote, setResolveNote] = useState('');

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    // Alert configuration
    const [alertConfig, setAlertConfig] = useState<AlertConfig>({
        cpuThreshold: 80,
        memoryThreshold: 85,
        temperatureThreshold: 70,
        diskThreshold: 90,
        enableEmailNotifications: true,
        enablePushNotifications: false,
        alertTypes: {}
    });

    // Use real-time alerts hook
    const {
        acknowledgeAlert,
        resolveAlert,
        createCustomAlert
    } = useRealTimeAlerts({
        deviceId: params.id,
        onNewAlert: (alert) => {
            setAlerts(prev => [alert, ...prev]);
        },
        onAlertResolved: (alert) => {
            setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
        }
    });

    // Generate chart data
    const generateChartData = () => {
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return {
                date: date.toLocaleDateString(),
                count: Math.floor(Math.random() * 5) + 1  // Changed from 'alerts' to 'count'
            };
        });
    };

    // Calculate stats using the shared type
    const alertStats: AlertStatsType = {
        total: alerts.length,
        active: alerts.filter(a => !a.resolved).length,
        resolved: alerts.filter(a => a.resolved).length,
        critical: alerts.filter(a => a.severity === 'CRITICAL' && !a.resolved).length,
        bySeverity: {
            INFO: alerts.filter(a => a.severity === 'INFO').length,
            WARNING: alerts.filter(a => a.severity === 'WARNING').length,
            ERROR: alerts.filter(a => a.severity === 'ERROR').length,
            CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
        },
        byType: ALERT_TYPES.reduce((acc, type) => {
            acc[type.key] = alerts.filter(alert => alert.type === type.key).length;
            return acc;
        }, {} as Record<string, number>),
        trend: generateChartData()
    };

    // Fetch device info
    useEffect(() => {
        async function fetchDeviceInfo() {
            try {
                setLoading(true);
                const response = await fetch(`/api/devices/${params.id}`);
                if (!response.ok) throw new Error('Failed to fetch device info');
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

    // Fetch alerts
    const fetchAlerts = async () => {
        try {
            setAlertsLoading(true);
            const response = await fetch(`/api/devices/${params.id}/alerts`);
            if (!response.ok) {
                setAlerts(generateMockAlerts());
                return;
            }
            const data = await response.json();
            setAlerts(data.alerts || []);
        } catch (err) {
            setAlerts(generateMockAlerts());
        } finally {
            setAlertsLoading(false);
        }
    };

    useEffect(() => {
        if (device) {
            fetchAlerts();
        }
    }, [device]);

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

    // Generate mock alerts
    const generateMockAlerts = (): Alert[] => {
        if (!device) return [];
        const now = new Date();
        return [
            {
                id: '1',
                deviceId: device.id,
                type: 'HIGH_CPU',
                severity: 'WARNING',
                title: 'High CPU Usage',
                message: 'CPU usage has exceeded 85% for the past 5 minutes',
                resolved: false,
                createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                metadata: { threshold: 85, currentValue: 92 }
            },
            {
                id: '2',
                deviceId: device.id,
                type: 'SECURITY_ALERT',
                severity: 'CRITICAL',
                title: 'Failed Login Attempts',
                message: 'Multiple failed SSH login attempts detected',
                resolved: false,
                createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                metadata: { attempts: 15, sourceIPs: ['192.168.1.100'] }
            }
        ];
    };

    // Clear all filters
    const handleClearFilters = () => {
        setSearchQuery('');
        setSeverityFilter('');
        setStatusFilter('');
        setTypeFilter('');
    };

    // Alert actions
    const handleAlertView = (alert: Alert) => {
        setSelectedAlert(alert);
        onOpen();
    };

    const handleAcknowledgeAlert = async (alertId: string) => {
        const success = await acknowledgeAlert(alertId);
        if (success) {
            setAlerts(prev => prev.map(alert =>
                alert.id === alertId
                    ? { ...alert, acknowledgedAt: new Date().toISOString() }
                    : alert
            ));
        }
    };

    const handleResolveAlert = async (alertId: string) => {
        const success = await resolveAlert(alertId, resolveNote);
        if (success) {
            setAlerts(prev => prev.map(alert =>
                alert.id === alertId
                    ? { ...alert, resolved: true, resolvedAt: new Date().toISOString() }
                    : alert
            ));
            setSelectedAlert(null);
            onOpenChange();
            setResolveNote('');
        }
    };

    const generateTypeData = () => {
        return ALERT_TYPES.map(type => ({
            type: type.label,
            count: alerts.filter(alert => alert.type === type.key).length
        })).filter(item => item.count > 0);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
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

            {/* Use AlertStats Component */}
            <div className="mb-6">
                <AlertStats stats={alertStats} />
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
                        {/* Use AlertFilters Component */}
                        <Card>
                            <CardBody>
                                <AlertFilters
                                    searchQuery={searchQuery}
                                    severityFilter={severityFilter}
                                    statusFilter={statusFilter}
                                    typeFilter={typeFilter}
                                    onSearchChange={setSearchQuery}
                                    onSeverityChange={setSeverityFilter}
                                    onStatusChange={setStatusFilter}
                                    onTypeChange={setTypeFilter}
                                    onClearFilters={handleClearFilters}
                                />
                            </CardBody>
                        </Card>

                        {/* Alerts List using AlertCard components */}
                        <Card>
                            <CardBody>
                                {alertsLoading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                        <p className="text-default-500">Loading alerts...</p>
                                    </div>
                                ) : filteredAlerts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <AlertTriangle className="w-12 h-12 text-default-300 mx-auto mb-4" />
                                        <p className="text-default-500">No alerts found</p>
                                        <p className="text-sm text-default-400">
                                            {alerts.length === 0 ? 'This device has no alerts yet' : 'Try adjusting your filters'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredAlerts.map((alert) => (
                                            <AlertCard
                                                key={alert.id}
                                                alert={alert}
                                                onView={handleAlertView}
                                                onAcknowledge={handleAcknowledgeAlert}
                                                onResolve={handleResolveAlert}
                                                compact={false}
                                            />
                                        ))}
                                    </div>
                                )}
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
                                        <Line type="monotone" dataKey="count" stroke="#0070f3" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardBody>
                        </Card>

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
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>Alert Details</ModalHeader>
                            <ModalBody>
                                {selectedAlert && (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">{selectedAlert.title}</h3>
                                            <p className="text-default-600">{selectedAlert.message}</p>
                                        </div>
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
                                <Button variant="light" onPress={onClose}>Close</Button>
                                {selectedAlert && !selectedAlert.resolved && (
                                    <Button
                                        color="success"
                                        onPress={() => handleResolveAlert(selectedAlert.id)}
                                    >
                                        Resolve Alert
                                    </Button>
                                )}
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Configuration Modal - Simplified */}
            <Modal isOpen={isConfigOpen} onOpenChange={onConfigOpenChange} size="2xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>Alert Configuration</ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            CPU Warning Threshold (%)
                                        </label>
                                        <Input
                                            type="number"
                                            value={alertConfig.cpuThreshold.toString()}
                                            onChange={(e) => setAlertConfig(prev => ({
                                                ...prev,
                                                cpuThreshold: parseInt(e.target.value) || 80
                                            }))}
                                        />
                                    </div>
                                    {/* Add other threshold configurations as needed */}
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>Cancel</Button>
                                <Button color="primary" onPress={onClose}>Save Configuration</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}