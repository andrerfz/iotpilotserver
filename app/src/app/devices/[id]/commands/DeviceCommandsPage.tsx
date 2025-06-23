'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Play,
    RotateCcw,
    Power,
    Download,
    Package,
    Terminal,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    Eye,
    RefreshCw
} from 'lucide-react';
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Select,
    SelectItem,
    Textarea,
    useDisclosure
} from '@heroui/react';
import { toast } from 'sonner';

interface DeviceCommandsPageProps {
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

interface Command {
    id: string;
    deviceId: string;
    command: string;
    arguments?: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
    output?: string;
    error?: string;
    exitCode?: number;
    executedAt?: string;
    createdAt: string;
    updatedAt: string;
}

const PREDEFINED_COMMANDS = [
    {
        id: 'REBOOT',
        label: 'Reboot Device',
        description: 'Restart the device',
        icon: RotateCcw,
        color: 'warning' as const,
        requiresConfirmation: true
    },
    {
        id: 'SHUTDOWN',
        label: 'Shutdown',
        description: 'Power off the device',
        icon: Power,
        color: 'danger' as const,
        requiresConfirmation: true
    },
    {
        id: 'UPDATE',
        label: 'Update System',
        description: 'Update packages and OS',
        icon: Download,
        color: 'primary' as const,
        requiresConfirmation: true
    },
    {
        id: 'RESTART',
        label: 'Restart Services',
        description: 'Restart IoT agent services',
        icon: RefreshCw,
        color: 'secondary' as const,
        requiresConfirmation: false
    }
];

export default function DeviceCommandsPage({ params }: DeviceCommandsPageProps) {
    const router = useRouter();
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { isOpen: isCustomOpen, onOpen: onCustomOpen, onOpenChange: onCustomOpenChange } = useDisclosure();

    const [device, setDevice] = useState<DeviceInfo | null>(null);
    const [commands, setCommands] = useState<Command[]>([]);
    const [loading, setLoading] = useState(true);
    const [commandsLoading, setCommandsLoading] = useState(false);
    const [executingCommand, setExecutingCommand] = useState<string | null>(null);
    const [selectedCommand, setSelectedCommand] = useState<typeof PREDEFINED_COMMANDS[0] | null>(null);

    // Custom command form
    const [customCommand, setCustomCommand] = useState('');
    const [customArguments, setCustomArguments] = useState('');

    // Command detail modal
    const [selectedCommandDetail, setSelectedCommandDetail] = useState<Command | null>(null);
    const { isOpen: isDetailOpen, onOpen: onDetailOpen, onOpenChange: onDetailOpenChange } = useDisclosure();

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

    // Fetch commands
    const fetchCommands = async () => {
        try {
            setCommandsLoading(true);
            const response = await fetch(`/api/devices/${params.id}/commands?limit=50`);

            if (!response.ok) {
                throw new Error('Failed to fetch commands');
            }

            const data = await response.json();
            setCommands(data.commands || []);
        } catch (err) {
            toast.error('Failed to load commands');
        } finally {
            setCommandsLoading(false);
        }
    };

    useEffect(() => {
        if (device) {
            fetchCommands();
        }
    }, [device]);

    // Auto-refresh commands every 5 seconds
    useEffect(() => {
        if (!device) return;

        const interval = setInterval(fetchCommands, 5000);
        return () => clearInterval(interval);
    }, [device]);

    const handleExecuteCommand = async (commandType: string, args?: string) => {
        if (!device) return;

        try {
            setExecutingCommand(commandType);

            const response = await fetch(`/api/devices/${params.id}/commands`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    command: commandType,
                    arguments: args || '',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to execute command');
            }

            const data = await response.json();
            toast.success(`Command "${commandType}" issued successfully`);

            // Refresh commands list
            fetchCommands();

            // Close modals
            onOpenChange();
            onCustomOpenChange();

        } catch (err) {
            toast.error(`Failed to execute command: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setExecutingCommand(null);
        }
    };

    const handlePredefinedCommand = (cmd: typeof PREDEFINED_COMMANDS[0]) => {
        setSelectedCommand(cmd);
        if (cmd.requiresConfirmation) {
            onOpen();
        } else {
            handleExecuteCommand(cmd.id);
        }
    };

    const handleCustomCommand = () => {
        if (!customCommand.trim()) {
            toast.error('Please enter a command');
            return;
        }

        handleExecuteCommand('CUSTOM', customCommand.trim() + (customArguments.trim() ? ` ${customArguments.trim()}` : ''));
        setCustomCommand('');
        setCustomArguments('');
    };

    const getStatusIcon = (status: Command['status']) => {
        switch (status) {
            case 'PENDING':
                return <Clock className="w-4 h-4" />;
            case 'RUNNING':
                return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'COMPLETED':
                return <CheckCircle className="w-4 h-4" />;
            case 'FAILED':
                return <XCircle className="w-4 h-4" />;
            case 'TIMEOUT':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: Command['status']) => {
        switch (status) {
            case 'PENDING':
                return 'default';
            case 'RUNNING':
                return 'primary';
            case 'COMPLETED':
                return 'success';
            case 'FAILED':
                return 'danger';
            case 'TIMEOUT':
                return 'warning';
            default:
                return 'default';
        }
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const handleCommandDetail = (command: Command) => {
        setSelectedCommandDetail(command);
        onDetailOpen();
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-default-500">Loading device commands...</p>
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
                            <Terminal className="w-6 h-6 mr-2" />
                            Commands - {device.hostname}
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
                    <Button
                        onClick={fetchCommands}
                        variant="bordered"
                        size="sm"
                        startContent={<RefreshCw className="w-4 h-4" />}
                        isLoading={commandsLoading}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {device.status !== 'ONLINE' && (
                <Card className="mb-6">
                    <CardBody>
                        <div className="flex items-center text-warning">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            <p>Device is offline. Commands will be queued until the device comes online.</p>
                        </div>
                    </CardBody>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-1">
                    <Card className="mb-6">
                        <CardHeader>
                            <h3 className="text-lg font-semibold">Quick Actions</h3>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-3">
                                {PREDEFINED_COMMANDS.map((cmd) => {
                                    const IconComponent = cmd.icon;
                                    return (
                                        <Button
                                            key={cmd.id}
                                            onClick={() => handlePredefinedCommand(cmd)}
                                            color={cmd.color}
                                            variant="bordered"
                                            startContent={<IconComponent className="w-4 h-4" />}
                                            className="w-full justify-start"
                                            isLoading={executingCommand === cmd.id}
                                            isDisabled={!!executingCommand}
                                        >
                                            <div className="text-left">
                                                <div className="font-medium">{cmd.label}</div>
                                                <div className="text-xs opacity-70">{cmd.description}</div>
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-semibold">Custom Command</h3>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-3">
                                <Input
                                    label="Command"
                                    placeholder="e.g., ls, ps aux, systemctl status"
                                    value={customCommand}
                                    onChange={(e) => setCustomCommand(e.target.value)}
                                />
                                <Input
                                    label="Arguments (optional)"
                                    placeholder="Command arguments"
                                    value={customArguments}
                                    onChange={(e) => setCustomArguments(e.target.value)}
                                />
                                <Button
                                    onClick={onCustomOpen}
                                    color="primary"
                                    startContent={<Play className="w-4 h-4" />}
                                    isDisabled={!customCommand.trim() || !!executingCommand}
                                    className="w-full"
                                >
                                    Execute Custom Command
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Command History */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between w-full">
                                <h3 className="text-lg font-semibold">Command History</h3>
                                <p className="text-sm text-default-500">{commands.length} commands</p>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {commandsLoading ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                    <p className="text-default-500">Loading commands...</p>
                                </div>
                            ) : commands.length === 0 ? (
                                <div className="text-center py-8">
                                    <Terminal className="w-12 h-12 text-default-300 mx-auto mb-4" />
                                    <p className="text-default-500">No commands executed yet</p>
                                    <p className="text-sm text-default-400">Use the quick actions or custom command to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {commands.map((command) => (
                                        <div
                                            key={command.id}
                                            className="border border-default-200 rounded-lg p-4 hover:bg-default-50 transition-colors cursor-pointer"
                                            onClick={() => handleCommandDetail(command)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Chip
                                                            color={getStatusColor(command.status)}
                                                            variant="flat"
                                                            size="sm"
                                                            startContent={getStatusIcon(command.status)}
                                                        >
                                                            {command.status}
                                                        </Chip>
                                                        <code className="text-sm font-mono bg-default-100 px-2 py-1 rounded">
                                                            {command.command}
                                                            {command.arguments && ` ${command.arguments}`}
                                                        </code>
                                                    </div>
                                                    <div className="text-sm text-default-500">
                                                        Created: {formatDateTime(command.createdAt)}
                                                        {command.executedAt && (
                                                            <>
                                                                {' • '}
                                                                Executed: {formatDateTime(command.executedAt)}
                                                            </>
                                                        )}
                                                    </div>
                                                    {command.exitCode !== undefined && (
                                                        <div className="text-sm text-default-500">
                                                            Exit code: {command.exitCode}
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    startContent={<Eye className="w-4 h-4" />}
                                                >
                                                    Details
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Confirm Command Execution
                            </ModalHeader>
                            <ModalBody>
                                <p>
                                    Are you sure you want to execute <strong>{selectedCommand?.label}</strong> on{' '}
                                    <strong>{device.hostname}</strong>?
                                </p>
                                <p className="text-sm text-default-500">
                                    {selectedCommand?.description}
                                </p>
                                {selectedCommand?.id === 'SHUTDOWN' && (
                                    <div className="bg-danger-50 p-3 rounded-lg border border-danger-200">
                                        <p className="text-danger text-sm font-medium">
                                            ⚠️ Warning: This will power off the device. You may need physical access to restart it.
                                        </p>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    color={selectedCommand?.color}
                                    onPress={() => selectedCommand && handleExecuteCommand(selectedCommand.id)}
                                    isLoading={!!executingCommand}
                                >
                                    Execute Command
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Custom Command Confirmation Modal */}
            <Modal isOpen={isCustomOpen} onOpenChange={onCustomOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Execute Custom Command
                            </ModalHeader>
                            <ModalBody>
                                <p>
                                    Execute custom command on <strong>{device.hostname}</strong>?
                                </p>
                                <div className="bg-default-100 p-3 rounded-lg">
                                    <code className="text-sm">
                                        {customCommand}
                                        {customArguments && ` ${customArguments}`}
                                    </code>
                                </div>
                                <div className="bg-warning-50 p-3 rounded-lg border border-warning-200">
                                    <p className="text-warning text-sm">
                                        ⚠️ Be careful with custom commands. They run with elevated privileges.
                                    </p>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={handleCustomCommand}
                                    isLoading={!!executingCommand}
                                >
                                    Execute
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Command Detail Modal */}
            <Modal
                isOpen={isDetailOpen}
                onOpenChange={onDetailOpenChange}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Command Details
                            </ModalHeader>
                            <ModalBody>
                                {selectedCommandDetail && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-default-500">Status</p>
                                                <Chip
                                                    color={getStatusColor(selectedCommandDetail.status)}
                                                    variant="flat"
                                                    startContent={getStatusIcon(selectedCommandDetail.status)}
                                                >
                                                    {selectedCommandDetail.status}
                                                </Chip>
                                            </div>
                                            <div>
                                                <p className="text-sm text-default-500">Exit Code</p>
                                                <p className="font-mono">
                                                    {selectedCommandDetail.exitCode ?? 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm text-default-500">Command</p>
                                            <code className="text-sm font-mono bg-default-100 px-2 py-1 rounded block">
                                                {selectedCommandDetail.command}
                                                {selectedCommandDetail.arguments && ` ${selectedCommandDetail.arguments}`}
                                            </code>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-default-500">Created</p>
                                                <p className="text-sm">{formatDateTime(selectedCommandDetail.createdAt)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-default-500">Executed</p>
                                                <p className="text-sm">
                                                    {selectedCommandDetail.executedAt
                                                        ? formatDateTime(selectedCommandDetail.executedAt)
                                                        : 'Not executed'
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {selectedCommandDetail.output && (
                                            <div>
                                                <p className="text-sm text-default-500 mb-2">Output</p>
                                                <Textarea
                                                    value={selectedCommandDetail.output}
                                                    isReadOnly
                                                    className="font-mono text-sm"
                                                    minRows={3}
                                                    maxRows={10}
                                                />
                                            </div>
                                        )}

                                        {selectedCommandDetail.error && (
                                            <div>
                                                <p className="text-sm text-default-500 mb-2">Error</p>
                                                <Textarea
                                                    value={selectedCommandDetail.error}
                                                    isReadOnly
                                                    className="font-mono text-sm"
                                                    color="danger"
                                                    minRows={2}
                                                    maxRows={8}
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
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}