'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Terminal, Wifi, WifiOff } from 'lucide-react';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import SSHTerminal from '@/components/ssh-terminal';

interface DeviceTerminalPageProps {
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

export default function DeviceTerminalPage({ params }: DeviceTerminalPageProps) {
    const router = useRouter();
    const [device, setDevice] = useState<DeviceInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showTerminal, setShowTerminal] = useState(false);

    // Fetch basic device info
    useEffect(() => {
        async function fetchDeviceInfo() {
            try {
                setLoading(true);
                const response = await fetch(`/api/devices/${params.id}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Device not found');
                    }
                    throw new Error('Failed to fetch device info');
                }

                const data = await response.json();
                setDevice(data);

                // Auto-show terminal if device is online
                if (data.status === 'ONLINE') {
                    setShowTerminal(true);
                }

                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        }

        fetchDeviceInfo();
    }, [params.id]);

    const handleBackToDevice = () => {
        router.push(`/devices/${params.id}`);
    };

    const handleCloseTerminal = () => {
        setShowTerminal(false);
        router.push(`/devices/${params.id}`);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-default-500">Loading device terminal...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !device) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-lg mx-auto">
                    <Card>
                        <CardBody className="text-center p-8">
                            <Terminal className="w-16 h-16 text-danger mx-auto mb-4" />
                            <h1 className="text-xl font-semibold mb-2">Terminal Unavailable</h1>
                            <p className="text-default-500 mb-4">
                                {error || 'Device not found'}
                            </p>
                            <Button onClick={handleBackToDevice} color="primary">
                                Back to Device
                            </Button>
                        </CardBody>
                    </Card>
                </div>
            </div>
        );
    }

    if (device.status !== 'ONLINE') {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-lg mx-auto">
                    <Card>
                        <CardBody className="text-center p-8">
                            <WifiOff className="w-16 h-16 text-warning mx-auto mb-4" />
                            <h1 className="text-xl font-semibold mb-2">Device Offline</h1>
                            <p className="text-default-500 mb-4">
                                Terminal access is only available when the device is online.
                            </p>
                            <div className="flex items-center justify-center mb-4">
                                <Chip
                                    color={device.status === 'MAINTENANCE' ? 'warning' : 'danger'}
                                    variant="flat"
                                >
                                    {device.status}
                                </Chip>
                            </div>
                            <Button onClick={handleBackToDevice} color="primary">
                                Back to Device
                            </Button>
                        </CardBody>
                    </Card>
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
                        onClick={handleBackToDevice}
                        variant="light"
                        size="sm"
                        startContent={<ArrowLeft className="w-4 h-4" />}
                        className="mr-4"
                    >
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center">
                            <Terminal className="w-6 h-6 mr-2" />
                            Terminal - {device.hostname}
                        </h1>
                        <p className="text-default-500 text-sm">
                            {device.deviceId} • {device.ipAddress}
                        </p>
                    </div>
                </div>
                <div className="flex items-center">
                    <Chip
                        color="success"
                        variant="flat"
                        startContent={<Wifi className="w-3 h-3" />}
                    >
                        {device.status}
                    </Chip>
                </div>
            </div>

            {/* Terminal */}
            <div className="h-[calc(100vh-200px)] min-h-[500px]">
                {showTerminal ? (
                    <SSHTerminal
                        deviceId={device.deviceId}
                        hostname={device.hostname}
                        onClose={handleCloseTerminal}
                    />
                ) : (
                    <Card className="h-full">
                        <CardBody className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Terminal className="w-16 h-16 text-primary mx-auto mb-4" />
                                <h2 className="text-xl font-semibold mb-2">SSH Terminal</h2>
                                <p className="text-default-500 mb-4">
                                    Connect to {device.hostname} via SSH
                                </p>
                                <Button
                                    onClick={() => setShowTerminal(true)}
                                    color="primary"
                                    size="lg"
                                    startContent={<Terminal className="w-4 h-4" />}
                                >
                                    Connect Terminal
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                )}
            </div>
        </div>
    );
}