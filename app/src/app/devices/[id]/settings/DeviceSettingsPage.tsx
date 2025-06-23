'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Settings,
    Save,
    RotateCcw,
    Info,
    Activity,
    Network,
    Shield,
    Server,
    Clock,
    AlertTriangle,
    Check,
    Edit,
    Trash2
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
    Switch,
    Textarea,
    Divider,
    Slider,
    Tabs,
    Tab
} from '@heroui/react';
import { toast } from 'sonner';

interface DeviceSettingsPageProps {
    params: {
        id: string;
    };
}

interface DeviceSettings {
    // Device Info
    hostname: string;
    location?: string;
    description?: string;
    tags: string[];

    // Monitoring
    heartbeatInterval: number;
    metricsEnabled: boolean;
    cpuThreshold: number;
    memoryThreshold: number;
    temperatureThreshold: number;
    diskThreshold: number;

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

const DEVICE_TYPES = [
    { key: 'PI_ZERO', label: 'Raspberry Pi Zero' },
    { key: 'PI_3', label: 'Raspberry Pi 3' },
    { key: 'PI_4', label: 'Raspberry Pi 4' },
    { key: 'PI_5', label: 'Raspberry Pi 5' },
    { key: 'ORANGE_PI', label: 'Orange Pi' },
    { key: 'GENERIC', label: 'Generic Device' },
    { key: 'UNKNOWN', label: 'Unknown' }
];

export default function DeviceSettingsPage({ params }: DeviceSettingsPageProps) {
    const router = useRouter();

    const [device, setDevice] = useState<DeviceInfo | null>(null);
    const [settings, setSettings] = useState<DeviceSettings>({
        hostname: '',
        location: '',
        description: '',
        tags: [],
        heartbeatInterval: 120,
        metricsEnabled: true,
        cpuThreshold: 80,
        memoryThreshold: 85,
        temperatureThreshold: 70,
        diskThreshold: 90,
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

    // Fetch device info and settings
    useEffect(() => {
        async function fetchDeviceData() {
            try {
                setLoading(true);

                // Fetch device info
                const deviceResponse = await fetch(`/api/devices/${params.id}`);
                if (!deviceResponse.ok) {
                    throw new Error('Failed to fetch device info');
                }

                const deviceData = await deviceResponse.json();
                setDevice(deviceData);

                // Fetch device settings (or use defaults)
                try {
                    const settingsResponse = await fetch(`/api/devices/${params.id}/settings`);
                    if (settingsResponse.ok) {
                        const settingsData = await settingsResponse.json();
                        setSettings({ ...settings, ...settingsData });
                        setOriginalSettings({ ...settings, ...settingsData });
                    } else {
                        // Use device data to populate initial settings
                        const initialSettings = {
                            ...settings,
                            hostname: deviceData.hostname || '',
                            location: deviceData.location || '',
                            description: deviceData.description || '',
                            ipAddress: deviceData.ipAddress,
                            tailscaleIp: deviceData.tailscaleIp,
                            agentVersion: deviceData.agentVersion
                        };
                        setSettings(initialSettings);
                        setOriginalSettings(initialSettings);
                    }
                } catch (err) {
                    // Settings endpoint doesn't exist yet, use defaults
                    const initialSettings = {
                        ...settings,
                        hostname: deviceData.hostname || '',
                        location: deviceData.location || '',
                        description: deviceData.description || '',
                        ipAddress: deviceData.ipAddress,
                        tailscaleIp: deviceData.tailscaleIp,
                        agentVersion: deviceData.agentVersion
                    };
                    setSettings(initialSettings);
                    setOriginalSettings(initialSettings);
                }

            } catch (err) {
                toast.error('Failed to load device information');
                router.push('/devices');
            } finally {
                setLoading(false);
            }
        }

        fetchDeviceData();
    }, [params.id]);

    // Check for changes
    useEffect(() => {
        if (originalSettings) {
            setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
        }
    }, [settings, originalSettings]);

    const handleSaveSettings = async () => {
        if (!device) return;

        try {
            setSaving(true);

            // Save basic device info first
            const deviceUpdateResponse = await fetch(`/api/devices/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hostname: settings.hostname,
                    location: settings.location,
                    description: settings.description,
                }),
            });

            if (!deviceUpdateResponse.ok) {
                throw new Error('Failed to update device information');
            }

            // Save device settings (when API is implemented)
            try {
                const settingsResponse = await fetch(`/api/devices/${params.id}/settings`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(settings),
                });

                if (!settingsResponse.ok) {
                    console.warn('Settings API not implemented yet');
                }
            } catch (err) {
                console.warn('Settings API not available yet');
            }

            toast.success('Device settings saved successfully');
            setOriginalSettings({ ...settings });
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
            <Tabs aria-label="Device Settings" className="w-full">
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
                                        <p className="font-medium">{device.deviceType}</p>
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
                                        />
                                        <p className="text-sm mt-1">{settings.heartbeatInterval} seconds</p>
                                    </div>
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
                                        />
                                        <p className="text-sm mt-1">{settings.memoryThreshold}%</p>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-3">Temperature Alert (°C)</h4>
                                        <Slider
                                            step={5}
                                            minValue={40}
                                            maxValue={100}
                                            value={settings.temperatureThreshold}
                                            onChange={(value) =>
                                                setSettings(prev => ({ ...prev, temperatureThreshold: Array.isArray(value) ? value[0] : value }))
                                            }
                                            className="max-w-md"
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
                                        />
                                        <p className="text-sm mt-1">{settings.diskThreshold}%</p>
                                    </div>
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
                                        />
                                        <p className="text-sm mt-1">
                                            Every {settings.apiKeyRotationDays} days
                                            {settings.apiKeyRotationDays === 365 && ' (disabled)'}
                                        </p>
                                    </div>

                                    <Divider />

                                    <div>
                                        <h4 className="font-medium mb-3">Actions</h4>
                                        <div className="flex gap-2">
                                            <Button
                                                color="warning"
                                                variant="bordered"
                                                startContent={<RotateCcw className="w-4 h-4" />}
                                            >
                                                Rotate API Key
                                            </Button>
                                            <Button
                                                color="danger"
                                                variant="bordered"
                                                startContent={<Trash2 className="w-4 h-4" />}
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