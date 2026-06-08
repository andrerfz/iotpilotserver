'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    Info,
    Network,
    RotateCcw,
    Save,
    Server,
    Settings,
    Shield,
    Trash2
} from 'lucide-react';
import {Button, Card, CardBody, CardHeader, Chip, Divider, Input, Select, SelectItem, Slider, Switch, Tab, Tabs, Textarea} from '@/components/ui';

import {toast} from 'sonner';
import {useAuth} from '@/contexts/auth-context';

interface DeviceSettingsPageProps {
    params: {
        id: string;
    };
}

interface DeviceSettings {
    // Device Info
    hostname: string;
    deviceType: string;
    location?: string;
    description?: string;
    tags: string[];

    // Monitoring
    reportingInterval: number;
    heartbeatInterval: number;
    metricsEnabled: boolean;
    // System device thresholds (Raspberry Pi etc.)
    cpuThreshold: number;
    memoryThreshold: number;
    temperatureThreshold: number;  // CPU temperature for system devices
    diskThreshold: number;
    // Sensor device thresholds (ESP32-C3, Heltec etc.)
    sensorTempThreshold: number;   // ambient temperature alert (°C)
    batteryThreshold: number;      // battery low alert (%)

    // Network
    ipAddress?: string;
    tailscaleIp?: string;
    networkMonitoring: boolean;

    // Agent
    agentVersion?: string;
    autoUpdate: boolean;
    updateChannel: 'stable' | 'beta' | 'nightly';

    // Security
    sshEnabled: boolean;
    apiKeyRotationDays: number;
}

interface DeviceInfo {
    id: string;
    deviceId: string;
    hostname: string;
    deviceType: string;
    deviceModel?: string;
    status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';
    location?: string;
    description?: string;
    ipAddress?: string;
    tailscaleIp?: string;
    architecture?: string;
    agentVersion?: string;
    registeredAt: string;
    lastSeen?: string;
}

const UPDATE_CHANNELS = [
    { key: 'stable', label: 'Stable' },
    { key: 'beta', label: 'Beta' },
    { key: 'nightly', label: 'Nightly' }
];

import {DeviceModelEnum, DEVICE_REGISTRY, isSensorDevice} from '@iotpilot/core/device/domain/value-objects/device-type.vo';

const DEVICE_TYPES = Object.values(DeviceModelEnum).map(key => ({
    key,
    label: DEVICE_REGISTRY[key].label,
}));

export default function DeviceSettingsPage({ params }: DeviceSettingsPageProps) {
    const router = useRouter();
    const {apiCall} = useAuth();

    const [device, setDevice] = useState<DeviceInfo | null>(null);
    const [settings, setSettings] = useState<DeviceSettings>({
        hostname: '',
        deviceType: 'UNKNOWN',
        location: '',
        description: '',
        tags: [],
        reportingInterval: 300,
        heartbeatInterval: 120,
        metricsEnabled: true,
        cpuThreshold: 80,
        memoryThreshold: 85,
        temperatureThreshold: 70,
        diskThreshold: 90,
        sensorTempThreshold: 8,
        batteryThreshold: 20,
        networkMonitoring: true,
        autoUpdate: false,
        updateChannel: 'stable',
        sshEnabled: true,
        apiKeyRotationDays: 30
    });

    const [originalSettings, setOriginalSettings] = useState<DeviceSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [newTag, setNewTag] = useState('');

    // Fetch device info and settings via API
    useEffect(() => {
        async function fetchDeviceAndSettings() {
            if (!params.id) return;
            setLoading(true);
            try {
                const [deviceRes, settingsRes] = await Promise.all([
                    apiCall(`/api/devices/${params.id}`),
                    apiCall(`/api/devices/${params.id}/settings`),
                ]);

                if (!deviceRes.ok) throw new Error('Failed to fetch device');

                const deviceResult = await deviceRes.json();
                const deviceData = deviceResult.data || deviceResult;
                const transformedDevice: DeviceInfo = {
                    id: deviceData.id || deviceData.deviceId || '',
                    deviceId: deviceData.deviceId || deviceData.id || '',
                    hostname: deviceData.hostname || deviceData.name || 'Unknown Device',
                    deviceType: deviceData.deviceType || 'UNKNOWN',
                    deviceModel: deviceData.deviceModel,
                    registeredAt: deviceData.registeredAt || new Date().toISOString(),
                    ipAddress: deviceData.ipAddress || 'N/A',
                    tailscaleIp: deviceData.tailscaleIp || 'N/A',
                    agentVersion: deviceData.agentVersion || 'N/A',
                    location: deviceData.location || '',
                    description: deviceData.description || '',
                    status: deviceData.status || 'UNKNOWN',
                };
                setDevice(transformedDevice);

                let initialSettings: DeviceSettings = {
                    ...settings,
                    hostname: transformedDevice.hostname,
                    deviceType: transformedDevice.deviceType,
                    location: transformedDevice.location,
                    description: transformedDevice.description,
                    ipAddress: transformedDevice.ipAddress,
                    tailscaleIp: transformedDevice.tailscaleIp,
                    agentVersion: transformedDevice.agentVersion,
                };

                if (settingsRes.ok) {
                    const settingsResult = await settingsRes.json();
                    const s = settingsResult.data || settingsResult;
                    initialSettings = { ...initialSettings, ...s };
                }

                setSettings(initialSettings);
                setOriginalSettings(initialSettings);
            } catch (err) {
                toast.error('Failed to load device information');
                router.push('/devices');
            } finally {
                setLoading(false);
            }
        }
        fetchDeviceAndSettings();
    }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Check for changes
    useEffect(() => {
        if (originalSettings) {
            setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
        }
    }, [settings, originalSettings]);

    const handleRevokeAccess = async () => {
        if (!confirm('Disable SSH access for this device? You can re-enable it in settings.')) return;
        setSettings(prev => ({ ...prev, sshEnabled: false }));
        try {
            setSaving(true);
            const response = await apiCall(`/api/devices/${params.id}/settings`, {
                method: 'PUT',
                body: JSON.stringify({ ...settings, sshEnabled: false }),
            });
            if (!response.ok) throw new Error('Failed to revoke access');
            toast.success('SSH access revoked for this device');
            setOriginalSettings(prev => prev ? { ...prev, sshEnabled: false } : prev);
            setHasChanges(false);
        } catch (err) {
            toast.error('Failed to revoke access');
            setSettings(prev => ({ ...prev, sshEnabled: true }));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!device) return;

        try {
            setSaving(true);
            const response = await apiCall(`/api/devices/${params.id}/settings`, {
                method: 'PUT',
                body: JSON.stringify(settings),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({error: 'Request failed'}));
                throw new Error(data.error || 'Failed to save settings');
            }

            toast.success('Device settings saved successfully');
            setOriginalSettings({...settings});
            setHasChanges(false);
        } catch (err) {
            toast.error(`Failed to save settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleResetSettings = () => {
        if (originalSettings) {
            setSettings({ ...originalSettings });
            setHasChanges(false);
        }
    };

    const handleAddTag = () => {
        if (newTag.trim() && !settings.tags.includes(newTag.trim())) {
            setSettings(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }));
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setSettings(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-default-500">Loading device settings...</p>
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
                            <Settings className="w-6 h-6 mr-2" />
                            Settings - {device.hostname}
                        </h1>
                        <p className="text-default-500 text-sm">
                            {device.deviceId} • {device.ipAddress}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Chip
                        color={device.status === 'ONLINE' ? 'success' : 'danger'}
                        variant="flat"
                    >
                        {device.status}
                    </Chip>
                    {hasChanges && (
                        <Chip color="warning" variant="flat">
                            Unsaved Changes
                        </Chip>
                    )}
                </div>
            </div>

            {/* Save Actions */}
            {hasChanges && (
                <Card className="mb-6">
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-warning">
                                <AlertTriangle className="w-5 h-5 mr-2" />
                                <span>You have unsaved changes</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="bordered"
                                    onClick={handleResetSettings}
                                    startContent={<RotateCcw className="w-4 h-4" />}
                                >
                                    Reset
                                </Button>
                                <Button
                                    color="primary"
                                    onClick={handleSaveSettings}
                                    isLoading={saving}
                                    startContent={<Save className="w-4 h-4" />}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Settings Tabs */}
            <Tabs aria-label="Device Settings" className="w-full" disableAnimation>
                <Tab
                    key="general"
                    title={
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            General
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* Device Information */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Device Information</h3>
                            </CardHeader>
                            <CardBody>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Device Name"
                                        placeholder="Enter device name"
                                        value={settings.hostname}
                                        onChange={(e) => setSettings(prev => ({ ...prev, hostname: e.target.value }))}
                                    />
                                    <Select
                                        label="Device Type"
                                        selectedKeys={[settings.deviceType]}
                                        onChange={(e) => setSettings(prev => ({ ...prev, deviceType: e.target.value }))}
                                    >
                                        {DEVICE_TYPES.map((type) => (
                                            <SelectItem key={type.key}>{type.label}</SelectItem>
                                        ))}
                                    </Select>
                                    <Input
                                        label="Location"
                                        placeholder="e.g., Living Room, Server Rack A"
                                        value={settings.location || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, location: e.target.value }))}
                                    />
                                    <div className="md:col-span-2">
                                        <Textarea
                                            label="Description"
                                            placeholder="Device description..."
                                            value={settings.description || ''}
                                            onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <Divider className="my-6" />

                                {/* Tags */}
                                <div>
                                    <h4 className="text-md font-medium mb-3">Tags</h4>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {settings.tags.map((tag) => (
                                            <Chip
                                                key={tag}
                                                onClose={() => handleRemoveTag(tag)}
                                                variant="flat"
                                                color="primary"
                                            >
                                                {tag}
                                            </Chip>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add tag..."
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                        />
                                        <Button onClick={handleAddTag} color="primary">
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        {/* Device Details */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Device Details</h3>
                            </CardHeader>
                            <CardBody>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-sm text-default-500">Device Type</p>
                                        <p className="font-medium">{DEVICE_TYPES.find(t => t.key === device.deviceType)?.label || device.deviceType}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-default-500">Architecture</p>
                                        <p className="font-medium">{device.architecture || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-default-500">Model</p>
                                        <p className="font-medium">{device.deviceModel || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-default-500">Registered</p>
                                        <p className="font-medium">{formatDateTime(device.registeredAt)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-default-500">Last Seen</p>
                                        <p className="font-medium">
                                            {device.lastSeen ? formatDateTime(device.lastSeen) : 'Never'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-default-500">Agent Version</p>
                                        <p className="font-medium">{device.agentVersion || 'Unknown'}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </Tab>

                <Tab
                    key="monitoring"
                    title={
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Monitoring
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* Monitoring Configuration */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Monitoring Configuration</h3>
                            </CardHeader>
                            <CardBody>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium">Enable Metrics Collection</h4>
                                            <p className="text-sm text-default-500">Collect and store device metrics</p>
                                        </div>
                                        <Switch
                                            isSelected={settings.metricsEnabled}
                                            onValueChange={(checked) =>
                                                setSettings(prev => ({ ...prev, metricsEnabled: checked }))
                                            }
                                        />
                                    </div>

                                    {isSensorDevice(settings.deviceType) && (
                                        <>
                                            <div>
                                                <h4 className="font-medium mb-1">Sensor Reporting Interval</h4>
                                                <p className="text-sm text-default-500 mb-3">
                                                    How often the IoT sensor wakes up and sends a reading. Applied on the next wakeup cycle.
                                                </p>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {[
                                                        { label: '5 min', value: 300 },
                                                        { label: '15 min', value: 900 },
                                                        { label: '30 min', value: 1800 },
                                                        { label: '1 h', value: 3600 },
                                                        { label: '2 h', value: 7200 },
                                                        { label: '6 h', value: 21600 },
                                                        { label: '12 h', value: 43200 },
                                                    ].map(({ label, value }) => (
                                                        <Button
                                                            key={value}
                                                            size="sm"
                                                            variant={settings.reportingInterval === value ? 'solid' : 'bordered'}
                                                            color={settings.reportingInterval === value ? 'primary' : 'default'}
                                                            onPress={() => setSettings(prev => ({ ...prev, reportingInterval: value }))}
                                                        >
                                                            {label}
                                                        </Button>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-default-400">
                                                    Current: every {settings.reportingInterval >= 3600
                                                        ? `${settings.reportingInterval / 3600}h`
                                                        : `${settings.reportingInterval / 60}min`}
                                                </p>
                                            </div>
                                            <Divider />
                                        </>
                                    )}

                                    {!isSensorDevice(settings.deviceType) && (
                                        <div>
                                            <h4 className="font-medium mb-3">Heartbeat Interval</h4>
                                            <p className="text-sm text-default-500 mb-3">
                                                How often the device sends status updates (in seconds)
                                            </p>
                                            <Slider
                                                step={30}
                                                minValue={30}
                                                maxValue={600}
                                                value={settings.heartbeatInterval}
                                                onChange={(value) =>
                                                    setSettings(prev => ({ ...prev, heartbeatInterval: Array.isArray(value) ? value[0] : value }))
                                                }
                                                className="max-w-md"
                                                showTooltip={false}
                                            />
                                            <p className="text-sm mt-1">{settings.heartbeatInterval} seconds</p>
                                        </div>
                                    )}
                                </div>
                            </CardBody>
                        </Card>

                        {/* Alert Thresholds */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Alert Thresholds</h3>
                            </CardHeader>
                            <CardBody>
                                <div className="space-y-6">
                                    {isSensorDevice(settings.deviceType) ? (
                                        <>
                                            <div>
                                                <h4 className="font-medium mb-1">High Temperature Alert (°C)</h4>
                                                <p className="text-sm text-default-500 mb-3">
                                                    Alert when ambient temperature exceeds this value
                                                </p>
                                                <Slider
                                                    step={1}
                                                    minValue={-30}
                                                    maxValue={50}
                                                    value={settings.sensorTempThreshold}
                                                    onChange={(value) =>
                                                        setSettings(prev => ({ ...prev, sensorTempThreshold: Array.isArray(value) ? value[0] : value }))
                                                    }
                                                    className="max-w-md"
                                                    showTooltip={false}
                                                />
                                                <p className="text-sm mt-1">{settings.sensorTempThreshold}°C</p>
                                            </div>

                                            <div>
                                                <h4 className="font-medium mb-1">Battery Low Alert (%)</h4>
                                                <p className="text-sm text-default-500 mb-3">
                                                    Alert when battery drops below this level
                                                </p>
                                                <Slider
                                                    step={5}
                                                    minValue={5}
                                                    maxValue={50}
                                                    value={settings.batteryThreshold}
                                                    onChange={(value) =>
                                                        setSettings(prev => ({ ...prev, batteryThreshold: Array.isArray(value) ? value[0] : value }))
                                                    }
                                                    className="max-w-md"
                                                    showTooltip={false}
                                                />
                                                <p className="text-sm mt-1">{settings.batteryThreshold}%</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <h4 className="font-medium mb-3">CPU Usage Alert (%)</h4>
                                                <Slider
                                                    step={5}
                                                    minValue={50}
                                                    maxValue={100}
                                                    value={settings.cpuThreshold}
                                                    onChange={(value) =>
                                                        setSettings(prev => ({ ...prev, cpuThreshold: Array.isArray(value) ? value[0] : value }))
                                                    }
                                                    className="max-w-md"
                                                    showTooltip={false}
                                                />
                                                <p className="text-sm mt-1">{settings.cpuThreshold}%</p>
                                            </div>

                                            <div>
                                                <h4 className="font-medium mb-3">Memory Usage Alert (%)</h4>
                                                <Slider
                                                    step={5}
                                                    minValue={50}
                                                    maxValue={100}
                                                    value={settings.memoryThreshold}
                                                    onChange={(value) =>
                                                        setSettings(prev => ({ ...prev, memoryThreshold: Array.isArray(value) ? value[0] : value }))
                                                    }
                                                    className="max-w-md"
                                                    showTooltip={false}
                                                />
                                                <p className="text-sm mt-1">{settings.memoryThreshold}%</p>
                                            </div>

                                            <div>
                                                <h4 className="font-medium mb-3">CPU Temperature Alert (°C)</h4>
                                                <Slider
                                                    step={5}
                                                    minValue={40}
                                                    maxValue={100}
                                                    value={settings.temperatureThreshold}
                                                    onChange={(value) =>
                                                        setSettings(prev => ({ ...prev, temperatureThreshold: Array.isArray(value) ? value[0] : value }))
                                                    }
                                                    className="max-w-md"
                                                    showTooltip={false}
                                                />
                                                <p className="text-sm mt-1">{settings.temperatureThreshold}°C</p>
                                            </div>

                                            <div>
                                                <h4 className="font-medium mb-3">Disk Usage Alert (%)</h4>
                                                <Slider
                                                    step={5}
                                                    minValue={70}
                                                    maxValue={100}
                                                    value={settings.diskThreshold}
                                                    onChange={(value) =>
                                                        setSettings(prev => ({ ...prev, diskThreshold: Array.isArray(value) ? value[0] : value }))
                                                    }
                                                    className="max-w-md"
                                                    showTooltip={false}
                                                />
                                                <p className="text-sm mt-1">{settings.diskThreshold}%</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </Tab>

                <Tab
                    key="network"
                    title={
                        <div className="flex items-center gap-2">
                            <Network className="w-4 h-4" />
                            Network
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* Network Information */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Network Information</h3>
                            </CardHeader>
                            <CardBody>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm text-default-500">IP Address</p>
                                        <p className="font-medium font-mono">{device.ipAddress || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-default-500">Tailscale IP</p>
                                        <p className="font-medium font-mono">
                                            {device.tailscaleIp || 'Not connected'}
                                        </p>
                                    </div>
                                </div>

                                <Divider className="my-6" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Network Monitoring</h4>
                                        <p className="text-sm text-default-500">Monitor network traffic and connectivity</p>
                                    </div>
                                    <Switch
                                        isSelected={settings.networkMonitoring}
                                        onValueChange={(checked) =>
                                            setSettings(prev => ({ ...prev, networkMonitoring: checked }))
                                        }
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </Tab>

                <Tab
                    key="agent"
                    title={
                        <div className="flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            Agent
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* Agent Configuration */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Agent Configuration</h3>
                            </CardHeader>
                            <CardBody>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm text-default-500">Current Version</p>
                                            <p className="font-medium">{device.agentVersion || 'Unknown'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500">Status</p>
                                            <Chip color="success" variant="flat" size="sm">
                                                Running
                                            </Chip>
                                        </div>
                                    </div>

                                    <Divider />

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium">Auto Update</h4>
                                            <p className="text-sm text-default-500">Automatically update the IoT agent</p>
                                        </div>
                                        <Switch
                                            isSelected={settings.autoUpdate}
                                            onValueChange={(checked) =>
                                                setSettings(prev => ({ ...prev, autoUpdate: checked }))
                                            }
                                        />
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-3">Update Channel</h4>
                                        <Select
                                            selectedKeys={[settings.updateChannel]}
                                            onSelectionChange={(keys) => {
                                                const selected = Array.from(keys)[0] as string;
                                                setSettings(prev => ({
                                                    ...prev,
                                                    updateChannel: selected as 'stable' | 'beta' | 'nightly'
                                                }));
                                            }}
                                            className="max-w-xs"
                                        >
                                            {UPDATE_CHANNELS.map((channel) => (
                                                <SelectItem key={channel.key}>
                                                    {channel.label}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </Tab>

                <Tab
                    key="security"
                    title={
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Security
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* Security Settings */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Security Settings</h3>
                            </CardHeader>
                            <CardBody>
                                <div className="space-y-6">
                                    {!isSensorDevice(settings.deviceType) && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium">SSH Access</h4>
                                                    <p className="text-sm text-default-500">Enable SSH terminal access</p>
                                                </div>
                                                <Switch
                                                    isSelected={settings.sshEnabled}
                                                    onValueChange={(checked) =>
                                                        setSettings(prev => ({ ...prev, sshEnabled: checked }))
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <h4 className="font-medium mb-3">API Key Rotation</h4>
                                                <p className="text-sm text-default-500 mb-3">
                                                    Automatically rotate API keys every X days
                                                </p>
                                                <Slider
                                                    step={1}
                                                    minValue={7}
                                                    maxValue={365}
                                                    value={settings.apiKeyRotationDays}
                                                    onChange={(value) =>
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            apiKeyRotationDays: Array.isArray(value) ? value[0] : value
                                                        }))
                                                    }
                                                    className="max-w-md"
                                                    showTooltip={false}
                                                />
                                                <p className="text-sm mt-1">
                                                    Every {settings.apiKeyRotationDays} days
                                                    {settings.apiKeyRotationDays === 365 && ' (disabled)'}
                                                </p>
                                            </div>

                                            <Divider />
                                        </>
                                    )}

                                    <div>
                                        <h4 className="font-medium mb-3">Actions</h4>
                                        <div className="flex gap-2">
                                            {!isSensorDevice(settings.deviceType) && (
                                                <Button
                                                    color="warning"
                                                    variant="bordered"
                                                    startContent={<RotateCcw className="w-4 h-4" />}
                                                    onClick={() => toast.info('API key rotation requires re-registering the device. Contact your administrator.')}
                                                >
                                                    Rotate API Key
                                                </Button>
                                            )}
                                            <Button
                                                color="danger"
                                                variant="bordered"
                                                startContent={<Trash2 className="w-4 h-4" />}
                                                onClick={handleRevokeAccess}
                                                isLoading={saving}
                                            >
                                                Revoke Access
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </Tab>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 mt-8">
                <Button
                    variant="bordered"
                    onClick={() => router.push(`/devices/${params.id}`)}
                >
                    Cancel
                </Button>
                <Button
                    color="primary"
                    onClick={handleSaveSettings}
                    isLoading={saving}
                    isDisabled={!hasChanges}
                    startContent={<Save className="w-4 h-4" />}
                >
                    Save Settings
                </Button>
            </div>
        </div>
    );
}