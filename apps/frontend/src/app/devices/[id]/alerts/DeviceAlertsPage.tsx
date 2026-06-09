'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertTriangle, ArrowLeft, RefreshCw, Settings, TrendingUp} from 'lucide-react';
import { EmptyState } from '@/components/ui';
import {Badge, Button, Card, CardBody, CardHeader, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Radio, RadioGroup, Slider, Tab, Tabs, Textarea, useDisclosure} from '@/components/ui';

import {toast} from 'sonner';
import {Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';

import {AlertCard} from '@/components/alerts/AlertCard';
import {AlertFilters} from '@/components/alerts/AlertFilters';
import {AlertStats} from '@/components/alerts/AlertStats';
import {useRealTimeAlerts} from '@/hooks/domain/use-real-time-alerts';
import {Alert, ALERT_TYPES, AlertStats as AlertStatsType} from '@/types/alert.types';
import {useAuth} from '@/contexts/auth-context';

interface Device {
    id: string;
    name: string;
    status: string;
    ipAddress: string;
    deviceType: string;
}

interface DeviceAlertsPageProps {
    params: { id: string };
}

interface TrendPoint {
    date: string;
    count: number;
    bySeverity?: Record<string, number>;
}

interface ThresholdForm {
    scope: 'device' | 'global';
    // system device
    cpuValue: number;
    memoryValue: number;
    temperatureValue: number;
    diskValue: number;
    // sensor device
    sensorTempValue: number;
    batteryValue: number;
}

const DEFAULT_THRESHOLDS: ThresholdForm = {
    scope: 'device',
    cpuValue: 80,
    memoryValue: 85,
    temperatureValue: 70,
    diskValue: 90,
    sensorTempValue: 8,
    batteryValue: 20,
};

function isSensor(deviceType: string): boolean {
    return ['HELTEC_LORA32_V3', 'ESP32_C3', 'ESP32', 'SENSOR'].includes(deviceType?.toUpperCase());
}

export default function DeviceAlertsPage({ params }: DeviceAlertsPageProps) {
    const router = useRouter();
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { isOpen: isConfigOpen, onOpen: onConfigOpen, onOpenChange: onConfigOpenChange } = useDisclosure();

    const {apiCall} = useAuth();

    const [device, setDevice] = useState<Device | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [loading, setLoading] = useState(true);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [resolveNote, setResolveNote] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const [trendData, setTrendData] = useState<TrendPoint[]>([]);
    const [trendLoading, setTrendLoading] = useState(false);

    const [thresholdForm, setThresholdForm] = useState<ThresholdForm>(DEFAULT_THRESHOLDS);
    const [existingThresholds, setExistingThresholds] = useState<Record<string, string>>({});
    const [savingConfig, setSavingConfig] = useState(false);

    const {acknowledgeAlert, resolveAlert} = useRealTimeAlerts({
        deviceId: params.id,
        onNewAlert: (alert) => setAlerts(prev => [alert, ...prev]),
        onAlertResolved: (alert) => setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a)),
    });

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
        trend: trendData.map(d => ({ date: d.date, count: d.count })),
    };

    useEffect(() => {
        async function fetchDeviceInfo() {
            try {
                setLoading(true);
                const response = await apiCall(`/api/devices/${params.id}`);
                if (!response.ok) throw new Error('Failed to fetch device');
                const result = await response.json();
                const data = result.data || result;
                setDevice({
                    id: data.id || data.deviceId || '',
                    name: data.hostname || data.name || 'Unknown Device',
                    status: data.status || 'UNKNOWN',
                    ipAddress: data.ipAddress || 'N/A',
                    deviceType: data.deviceType || 'UNKNOWN',
                });
            } catch {
                toast.error('Failed to load device information');
                router.push('/devices');
            } finally {
                setLoading(false);
            }
        }
        fetchDeviceInfo();
    }, [params.id, apiCall, router]);

    const fetchAlerts = useCallback(async () => {
        try {
            setAlertsLoading(true);
            const response = await apiCall(`/api/monitoring/alerts?deviceId=${params.id}`);
            if (response.ok) {
                const result = await response.json();
                const data = result.data || result;
                setAlerts(Array.isArray(data) ? data : data.alerts || []);
            }
        } catch {
            toast.error('Failed to load alerts');
        } finally {
            setAlertsLoading(false);
        }
    }, [apiCall, params.id]);

    const fetchTrend = useCallback(async () => {
        try {
            setTrendLoading(true);
            const res = await apiCall(`/api/monitoring/alerts/trend?deviceId=${params.id}&period=7d`);
            if (res.ok) {
                const body = await res.json();
                setTrendData(body.data ?? body);
            }
        } catch {
            // non-fatal — chart shows empty
        } finally {
            setTrendLoading(false);
        }
    }, [apiCall, params.id]);

    useEffect(() => {
        if (device) {
            fetchAlerts();
            fetchTrend();
        }
    }, [device, fetchAlerts, fetchTrend]);

    useEffect(() => {
        let filtered = alerts;
        if (severityFilter) filtered = filtered.filter(a => a.severity === severityFilter);
        if (statusFilter === 'active') filtered = filtered.filter(a => !a.resolved);
        else if (statusFilter === 'resolved') filtered = filtered.filter(a => a.resolved);
        else if (statusFilter === 'acknowledged') filtered = filtered.filter(a => a.acknowledgedAt && !a.resolved);
        if (typeFilter) filtered = filtered.filter(a => a.type === typeFilter);
        if (searchQuery) {
            filtered = filtered.filter(a =>
                a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.message.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        setFilteredAlerts(filtered);
    }, [alerts, severityFilter, statusFilter, typeFilter, searchQuery]);

    const loadThresholds = useCallback(async () => {
        if (!device) return;
        try {
            const res = await apiCall(`/api/monitoring/thresholds?deviceId=${params.id}`);
            if (!res.ok) return;
            const body = await res.json();
            const list: any[] = body.data?.thresholds ?? body.thresholds ?? [];

            const map: Record<string, string> = {};
            const form = { ...DEFAULT_THRESHOLDS };

            for (const t of list) {
                map[t.metricName] = t.id;
                if (t.metricName === 'cpu_usage') form.cpuValue = t.value;
                else if (t.metricName === 'memory_usage') form.memoryValue = t.value;
                else if (t.metricName === 'temperature') form.temperatureValue = t.value;
                else if (t.metricName === 'disk_usage') form.diskValue = t.value;
                else if (t.metricName === 'sensor_temperature') form.sensorTempValue = t.value;
                else if (t.metricName === 'battery') form.batteryValue = t.value;
            }
            setExistingThresholds(map);
            setThresholdForm(prev => ({ ...prev, ...form }));
        } catch {
            // non-fatal
        }
    }, [apiCall, params.id, device]);

    const handleOpenConfig = async () => {
        await loadThresholds();
        onConfigOpen();
    };

    const handleSaveConfig = async () => {
        if (!device) return;
        setSavingConfig(true);
        try {
            const sensor = isSensor(device.deviceType);
            const deviceId = thresholdForm.scope === 'device' ? params.id : null;

            const metrics = sensor
                ? [
                    { name: 'sensor_temperature', value: thresholdForm.sensorTempValue, unit: '°C', label: 'Sensor Temperature' },
                    { name: 'battery', value: thresholdForm.batteryValue, unit: '%', label: 'Battery' },
                ]
                : [
                    { name: 'cpu_usage', value: thresholdForm.cpuValue, unit: '%', label: 'CPU Usage' },
                    { name: 'memory_usage', value: thresholdForm.memoryValue, unit: '%', label: 'Memory Usage' },
                    { name: 'temperature', value: thresholdForm.temperatureValue, unit: '°C', label: 'CPU Temperature' },
                    { name: 'disk_usage', value: thresholdForm.diskValue, unit: '%', label: 'Disk Usage' },
                ];

            for (const metric of metrics) {
                const existingId = existingThresholds[metric.name];
                const body = {
                    deviceId,
                    name: `${metric.label} alert`,
                    description: `Alert when ${metric.label} exceeds threshold`,
                    metricName: metric.name,
                    operator: 'GREATER_THAN',
                    value: metric.value,
                    unit: metric.unit,
                    severity: 'MEDIUM',
                    type: 'STATIC',
                    cooldownMinutes: 5,
                };

                if (existingId) {
                    await apiCall(`/api/monitoring/thresholds/${existingId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ ...body, enabled: true }),
                    });
                } else {
                    await apiCall('/api/monitoring/thresholds', {
                        method: 'POST',
                        body: JSON.stringify(body),
                    });
                }
            }

            toast.success('Alert configuration saved');
            onConfigOpenChange();
        } catch {
            toast.error('Failed to save alert configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSeverityFilter('');
        setStatusFilter('');
        setTypeFilter('');
    };

    const handleResolveAlert = async (alertId: string) => {
        const success = await resolveAlert(alertId, resolveNote);
        if (success) {
            setAlerts(prev => prev.map(a =>
                a.id === alertId ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a
            ));
            setSelectedAlert(null);
            onOpenChange();
            setResolveNote('');
        }
    };

    const generateTypeData = () =>
        ALERT_TYPES.map(type => ({
            type: type.label,
            count: alerts.filter(a => a.type === type.key).length,
        })).filter(item => item.count > 0);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                        <p className="text-default-500">Loading device alerts...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!device) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Device not found</h1>
                <Button onClick={() => router.push('/devices')} color="primary">Back to Devices</Button>
            </div>
        );
    }

    const sensor = isSensor(device.deviceType);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Button
                        onClick={() => router.push(`/devices/${params.id}`)}
                        variant="light" size="sm"
                        startContent={<ArrowLeft className="w-4 h-4" />}
                        className="mr-4"
                    >
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center">
                            <AlertTriangle className="w-6 h-6 mr-2" />
                            Alerts — {device.name}
                        </h1>
                        <p className="text-default-500 text-sm">{device.id} • {device.ipAddress}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleOpenConfig} variant="bordered" size="sm" startContent={<Settings className="w-4 h-4" />}>
                        Configure
                    </Button>
                    <Button onClick={fetchAlerts} variant="bordered" size="sm" startContent={<RefreshCw className="w-4 h-4" />} isLoading={alertsLoading}>
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="mb-6">
                <AlertStats stats={alertStats} />
            </div>

            <Tabs aria-label="Alert Management" className="w-full">
                <Tab
                    key="alerts"
                    title={
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Alert History
                            {alertStats.active > 0 && <Badge color="danger" size="sm">{alertStats.active}</Badge>}
                        </div>
                    }
                >
                    <div className="space-y-4">
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

                        <Card>
                            <CardBody>
                                {alertsLoading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                                        <p className="text-default-500">Loading alerts...</p>
                                    </div>
                                ) : filteredAlerts.length === 0 ? (
                                    <EmptyState
                                        icon={<AlertTriangle className="w-12 h-12 text-default-300" />}
                                        title="No alerts found"
                                        description={alerts.length === 0 ? 'This device has no alerts yet' : 'Try adjusting your filters'}
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {filteredAlerts.map((alert) => (
                                            <AlertCard
                                                key={alert.id}
                                                alert={{
                                                    id: alert.id,
                                                    title: alert.title || 'Alert',
                                                    message: alert.message || 'No message provided',
                                                    severity: alert.severity || 'INFO',
                                                    status: alert.resolved ? 'RESOLVED' : 'ACTIVE',
                                                    deviceId: device.id,
                                                    createdAt: new Date(alert.createdAt),
                                                }}
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
                                {trendLoading ? (
                                    <div className="flex items-center justify-center h-[200px]">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                    </div>
                                ) : trendData.length === 0 ? (
                                    <div className="flex items-center justify-center h-[200px] text-default-400 text-sm">
                                        No alert data for this period
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="count" stroke="#0070f3" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Alert Types Distribution</h3>
                            </CardHeader>
                            <CardBody>
                                {generateTypeData().length === 0 ? (
                                    <div className="flex items-center justify-center h-[200px] text-default-400 text-sm">
                                        No alert data yet
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={generateTypeData()}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#0070f3" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
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
                                    <Button color="success" onPress={() => handleResolveAlert(selectedAlert.id)}>
                                        Resolve Alert
                                    </Button>
                                )}
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Configure Thresholds Modal */}
            <Modal isOpen={isConfigOpen} onOpenChange={onConfigOpenChange} size="xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>Alert Thresholds — {device.name}</ModalHeader>
                            <ModalBody className="space-y-6">
                                <RadioGroup
                                    label="Apply to"
                                    value={thresholdForm.scope}
                                    onValueChange={(v) => setThresholdForm(prev => ({ ...prev, scope: v as 'device' | 'global' }))}
                                    orientation="horizontal"
                                >
                                    <Radio value="device">This device only</Radio>
                                    <Radio value="global">All tenant devices</Radio>
                                </RadioGroup>

                                {sensor ? (
                                    <>
                                        <div>
                                            <p className="text-sm font-medium mb-1">High Temperature Alert (°C)</p>
                                            <p className="text-xs text-default-400 mb-3">Alert when ambient temperature exceeds this value</p>
                                            <Slider minValue={-30} maxValue={50} step={1} value={thresholdForm.sensorTempValue}
                                                onChange={(v) => setThresholdForm(prev => ({ ...prev, sensorTempValue: Array.isArray(v) ? v[0] : v }))}
                                                className="max-w-md" showTooltip={false} />
                                            <p className="text-sm mt-1">{thresholdForm.sensorTempValue}°C</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium mb-1">Battery Low Alert (%)</p>
                                            <p className="text-xs text-default-400 mb-3">Alert when battery drops below this level</p>
                                            <Slider minValue={5} maxValue={50} step={5} value={thresholdForm.batteryValue}
                                                onChange={(v) => setThresholdForm(prev => ({ ...prev, batteryValue: Array.isArray(v) ? v[0] : v }))}
                                                className="max-w-md" showTooltip={false} />
                                            <p className="text-sm mt-1">{thresholdForm.batteryValue}%</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-sm font-medium mb-3">CPU Usage Alert (%)</p>
                                            <Slider minValue={50} maxValue={100} step={5} value={thresholdForm.cpuValue}
                                                onChange={(v) => setThresholdForm(prev => ({ ...prev, cpuValue: Array.isArray(v) ? v[0] : v }))}
                                                className="max-w-md" showTooltip={false} />
                                            <p className="text-sm mt-1">{thresholdForm.cpuValue}%</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium mb-3">Memory Usage Alert (%)</p>
                                            <Slider minValue={50} maxValue={100} step={5} value={thresholdForm.memoryValue}
                                                onChange={(v) => setThresholdForm(prev => ({ ...prev, memoryValue: Array.isArray(v) ? v[0] : v }))}
                                                className="max-w-md" showTooltip={false} />
                                            <p className="text-sm mt-1">{thresholdForm.memoryValue}%</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium mb-3">CPU Temperature Alert (°C)</p>
                                            <Slider minValue={40} maxValue={100} step={5} value={thresholdForm.temperatureValue}
                                                onChange={(v) => setThresholdForm(prev => ({ ...prev, temperatureValue: Array.isArray(v) ? v[0] : v }))}
                                                className="max-w-md" showTooltip={false} />
                                            <p className="text-sm mt-1">{thresholdForm.temperatureValue}°C</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium mb-3">Disk Usage Alert (%)</p>
                                            <Slider minValue={70} maxValue={100} step={5} value={thresholdForm.diskValue}
                                                onChange={(v) => setThresholdForm(prev => ({ ...prev, diskValue: Array.isArray(v) ? v[0] : v }))}
                                                className="max-w-md" showTooltip={false} />
                                            <p className="text-sm mt-1">{thresholdForm.diskValue}%</p>
                                        </div>
                                    </>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose} isDisabled={savingConfig}>Cancel</Button>
                                <Button color="primary" onPress={handleSaveConfig} isLoading={savingConfig}>
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
