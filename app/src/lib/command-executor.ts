import {CommandStatus, Device, DeviceCommand} from '@prisma/client';
import {exec} from 'child_process';
import {promisify} from 'util';
import * as mqtt from 'mqtt';
import {tenantPrisma} from './tenant-middleware';
import {logger} from './logger';

// Device capabilities interface
interface DeviceCapabilities {
    protocols: string[];
    commands: string[];
    features: string[];
    restrictions?: string[];
    ssh?: {
        supported: boolean;
        port?: number;
        auth_methods?: string[];
    };
    mqtt?: {
        supported: boolean;
        broker_required?: boolean;
        topics?: string[];
    };
}

// Helper function to get device capabilities
function getDeviceCapabilities(device: Device): DeviceCapabilities {
    try {
        // Use type assertion to access capabilities property
        const deviceWithCapabilities = device as Device & {
            capabilities?: any
        };
        return deviceWithCapabilities.capabilities || {
            protocols: [],
            commands: [],
            features: []
        };
    } catch {
        // Fallback for devices without capabilities
        return {
            protocols: [],
            commands: [],
            features: []
        };
    }
}

// We'll dynamically import the SSH executor only on the server side
let sshExecutorFactory: any = null;

// Promisify exec for async/await usage
const execAsync = promisify(exec);

/**
 * Interface for command executors
 * Different implementations can handle different protocols (SSH, MQTT, etc.)
 */
export interface CommandExecutor {
    /**
     * Execute a command on a device
     * @param device The device to execute the command on
     * @param command The command to execute
     * @returns Promise resolving to the execution result
     */
    execute(device: Device, command: DeviceCommand): Promise<CommandExecutionResult>;

    /**
     * Check if this executor can handle the given device
     * @param device The device to check
     * @returns True if this executor can handle the device
     */
    canHandle(device: Device): boolean;
}

/**
 * Result of a command execution
 */
export interface CommandExecutionResult {
    status: CommandStatus;
    output?: string;
    error?: string;
    exitCode?: number;
}

/**
 * SSH Command Executor
 * Executes commands via SSH on devices that have an IP address
 */
export class SSHCommandExecutor implements CommandExecutor {
    private sshExecutor: any = null;
    private readonly sshConfig: any;

    constructor(config?: any) {
        // Default SSH configuration
        this.sshConfig = {
            host: '',
            port: 22,
            username: 'pi',
            // In production, you would use key-based authentication
            // or a secure way to retrieve passwords
            password: '',
            readyTimeout: 10000,
            ...config
        };
    }

    canHandle(device: Device): boolean {
        // Can only handle if we're on the server side and device has an IP address
        if (typeof window !== 'undefined') {
            return false; // Not available on client side
        }

        const capabilities = getDeviceCapabilities(device);

        // Check if device explicitly supports SSH
        if (capabilities.ssh?.supported === false) {
            return false;
        }

        // Check if SSH protocol is supported
        if (capabilities.protocols.length > 0 && !capabilities.protocols.includes('ssh')) {
            return false;
        }

        // Must have IP address for SSH connection
        const hasIpAddress = !!device.ipAddress || !!device.tailscaleIp;

        // SSH is supported if:
        // 1. Device has IP address AND
        // 2. SSH is not explicitly disabled AND
        // 3. SSH protocol is supported (or no protocols specified)
        const sshSupported = capabilities.ssh === undefined || capabilities.ssh.supported === true;
        return hasIpAddress &&
            sshSupported &&
            (capabilities.protocols.length === 0 || capabilities.protocols.includes('ssh'));
    }

    canExecuteCommand(device: Device, command: DeviceCommand): boolean {
        const capabilities = getDeviceCapabilities(device);

        // Check if command is in allowed commands list
        if (capabilities.commands.length > 0 && !capabilities.commands.includes(command.command)) {
            return false;
        }

        // Check for restrictions
        if (capabilities.restrictions?.includes('no_sudo') &&
            ['reboot', 'restart', 'update'].includes(command.command)) {
            return false;
        }

        return !(capabilities.restrictions?.includes('read_only') &&
            !['status', 'info', 'ps', 'df', 'top'].includes(command.command));

    }

    async execute(device: Device, command: DeviceCommand): Promise<CommandExecutionResult> {
        // Check if this executor can execute this specific command
        if (!this.canExecuteCommand(device, command)) {
            return {
                status: CommandStatus.FAILED,
                error: `Command '${command.command}' not supported by this device`,
                exitCode: 1
            };
        }
        // Check if we're on the server side
        if (typeof window !== 'undefined') {
            return {
                status: CommandStatus.FAILED,
                error: 'SSH functionality is only available on the server',
                exitCode: 1
            };
        }

        // Lazily load the SSH executor if not already loaded
        if (!this.sshExecutor) {
            try {
                if (!sshExecutorFactory) {
                    try {
                        const module = require('./ssh-executor.server.ts');
                        sshExecutorFactory = module.createSSHExecutor;
                    } catch (jsError) {
                        const module = eval('require("./ssh-executor.server")');
                        sshExecutorFactory = module.createSSHExecutor;
                    }
                }

                // Create a new SSH executor
                this.sshExecutor = sshExecutorFactory(this.sshConfig);
            } catch (err) {
                logger.error(`Failed to load SSH executor module: ${err}`);
                return {
                    status: CommandStatus.FAILED,
                    error: `Failed to load SSH module: ${err instanceof Error ? err.message : String(err)}`,
                    exitCode: 1
                };
            }
        }

        // Execute the command using the SSH executor
        return this.sshExecutor.execute(device, command);
    }
}

/**
 * MQTT Command Executor
 * Executes commands via MQTT for devices that support it
 */
export class MQTTCommandExecutor implements CommandExecutor {
    private readonly mqttConfig: {
        brokerUrl: string;
        username?: string;
        password?: string;
        commandTopic: string;
        responseTopic: string;
        qos: 0 | 1 | 2;
        timeout: number;
    };

    constructor(config?: Partial<typeof MQTTCommandExecutor.prototype.mqttConfig>) {
        // Default MQTT configuration
        this.mqttConfig = {
            brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
            username: process.env.MQTT_USERNAME,
            password: process.env.MQTT_PASSWORD,
            commandTopic: 'iotpilot/devices/{deviceId}/commands',
            responseTopic: 'iotpilot/devices/{deviceId}/responses',
            qos: 1,
            timeout: 30000, // 30 seconds
            ...config
        };
    }

    canHandle(device: Device): boolean {
        const capabilities = getDeviceCapabilities(device);

        // Check if device explicitly supports MQTT
        if (capabilities.mqtt?.supported === false) {
            return false;
        }

        // Check if MQTT protocol is supported
        if (capabilities.protocols.length > 0 && !capabilities.protocols.includes('mqtt')) {
            return false;
        }

        // Device must be online for MQTT
        const isOnline = device.status === 'ONLINE';

        // MQTT is supported if:
        // 1. Device is online AND
        // 2. MQTT is not explicitly disabled AND
        // 3. MQTT protocol is supported (or no protocols specified)
        const mqttSupported = capabilities.mqtt === undefined || capabilities.mqtt.supported === true;
        return isOnline &&
            mqttSupported &&
            (capabilities.protocols.length === 0 || capabilities.protocols.includes('mqtt'));
    }

    canExecuteCommand(device: Device, command: DeviceCommand): boolean {
        const capabilities = getDeviceCapabilities(device);

        // Same command checking logic as SSH
        if (capabilities.commands.length > 0 && !capabilities.commands.includes(command.command)) {
            return false;
        }

        // MQTT-specific restrictions
        if (capabilities.restrictions?.includes('mqtt_read_only') &&
            !['status', 'info', 'metrics'].includes(command.command)) {
            return false;
        }

        return true;
    }

    async execute(device: Device, command: DeviceCommand): Promise<CommandExecutionResult> {
        if (!this.canExecuteCommand(device, command)) {
            return {
                status: CommandStatus.FAILED,
                error: `Command '${command.command}' not supported via MQTT by this device`,
                exitCode: 1
            };
        }
        // Log the execution attempt
        logger.info(`Executing command via MQTT on device ${device.hostname}: ${command.command} ${command.arguments || ''}`);

        // Create topic names for this specific device
        const commandTopic = this.mqttConfig.commandTopic.replace('{deviceId}', device.deviceId);
        const responseTopic = this.mqttConfig.responseTopic.replace('{deviceId}', device.deviceId);

        return new Promise((resolve) => {
            // Connect to MQTT broker
            const client = mqtt.connect(this.mqttConfig.brokerUrl, {
                username: this.mqttConfig.username,
                password: this.mqttConfig.password,
                clientId: `iotpilot-server-${Math.random().toString(16).substring(2, 10)}`
            });

            // Set timeout
            const timeout = setTimeout(() => {
                client.end();
                logger.error(`MQTT command timeout for device ${device.deviceId}`);
                resolve({
                    status: CommandStatus.TIMEOUT,
                    error: 'Command execution timed out',
                    exitCode: 1
                });
            }, this.mqttConfig.timeout);

            // Handle connection error
            client.on('error', (err) => {
                clearTimeout(timeout);
                client.end();
                logger.error(`MQTT connection error: ${err.message}`);
                resolve({
                    status: CommandStatus.FAILED,
                    error: `MQTT connection error: ${err.message}`,
                    exitCode: 1
                });
            });

            // Handle successful connection
            client.on('connect', () => {
                logger.debug(`MQTT connected to broker for device ${device.deviceId}`);

                // Subscribe to response topic
                client.subscribe(responseTopic, {qos: this.mqttConfig.qos}, (err) => {
                    if (err) {
                        clearTimeout(timeout);
                        client.end();
                        logger.error(`MQTT subscription error: ${err.message}`);
                        resolve({
                            status: CommandStatus.FAILED,
                            error: `MQTT subscription error: ${err.message}`,
                            exitCode: 1
                        });
                        return;
                    }

                    // Prepare command message
                    const message = {
                        id: command.id,
                        command: command.command,
                        arguments: command.arguments,
                        timestamp: new Date().toISOString()
                    };

                    // Publish command to device
                    client.publish(commandTopic, JSON.stringify(message), {qos: this.mqttConfig.qos}, (err) => {
                        if (err) {
                            clearTimeout(timeout);
                            client.end();
                            logger.error(`MQTT publish error: ${err.message}`);
                            resolve({
                                status: CommandStatus.FAILED,
                                error: `MQTT publish error: ${err.message}`,
                                exitCode: 1
                            });
                        }
                        logger.debug(`Command published to ${commandTopic}`);
                    });
                });
            });

            // Handle incoming messages (command responses)
            client.on('message', (topic, message) => {
                if (topic === responseTopic) {
                    try {
                        const response = JSON.parse(message.toString());

                        // Check if this is a response to our command
                        if (response.id === command.id) {
                            clearTimeout(timeout);
                            client.end();

                            logger.info(`Received command response from device ${device.deviceId}`);

                            resolve({
                                status: response.success ? CommandStatus.COMPLETED : CommandStatus.FAILED,
                                output: response.output || '',
                                error: response.error || '',
                                exitCode: response.exitCode || (response.success ? 0 : 1)
                            });
                        }
                    } catch (err) {
                        logger.error(`Error parsing MQTT response: ${err}`);
                        // Continue waiting for a valid response
                    }
                }
            });
        });
    }
}

/**
 * Command Queue Manager
 * Manages a queue of commands for offline devices
 */
export class CommandQueueManager {
    private static instance: CommandQueueManager;
    private queueCheckInterval: NodeJS.Timeout | null = null;
    private executors: CommandExecutor[] = [];

    private constructor() {
        // Initialize with default executors
        this.executors = [
            new SSHCommandExecutor(),
            new MQTTCommandExecutor()
        ];
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): CommandQueueManager {
        if (!CommandQueueManager.instance) {
            CommandQueueManager.instance = new CommandQueueManager();
        }
        return CommandQueueManager.instance;
    }

    /**
     * Add a command executor
     */
    public addExecutor(executor: CommandExecutor): void {
        this.executors.push(executor);
    }

    /**
     * Execute a command immediately or queue it for later execution
     */
    public async executeOrQueue(deviceId: string, commandId: string): Promise<void> {
        try {
            // Get the device and command from the database
            const device = await tenantPrisma.client.device.findUnique({
                where: {id: deviceId}
            });

            const command = await tenantPrisma.client.deviceCommand.findUnique({
                where: {id: commandId}
            });

            if (!device || !command) {
                logger.error(`Device or command not found: ${deviceId}, ${commandId}`);
                return;
            }

            // If device is online, execute immediately
            if (device.status === 'ONLINE') {
                await this.executeCommand(device, command);
            } else {
                // Otherwise, leave it in the queue (it's already in PENDING state)
                logger.info(`Device ${device.hostname} is offline, command ${command.id} queued for later execution`);
            }
        } catch (error) {
            logger.error(`Error in executeOrQueue: ${error}`);
        }
    }

    /**
     * Execute a command using the appropriate executor
     */
    private async executeCommand(device: Device, command: DeviceCommand): Promise<void> {
        try {
            // Find an executor that can handle this device
            const executor = this.executors.find(e => e.canHandle(device));

            if (!executor) {
                logger.error(`No suitable executor found for device ${device.hostname}`);
                await tenantPrisma.client.deviceCommand.update({
                    where: {id: command.id},
                    data: {
                        status: CommandStatus.FAILED,
                        error: 'No suitable executor found for this device',
                        executedAt: new Date()
                    }
                });
                return;
            }

            // Update command status to RUNNING
            await tenantPrisma.client.deviceCommand.update({
                where: {id: command.id},
                data: {
                    status: CommandStatus.RUNNING,
                    executedAt: new Date()
                }
            });

            // Execute the command
            const result = await executor.execute(device, command);

            // Update command with result
            await tenantPrisma.client.deviceCommand.update({
                where: {id: command.id},
                data: {
                    status: result.status,
                    output: result.output || null,
                    error: result.error || null,
                    exitCode: result.exitCode || null,
                    updatedAt: new Date()
                }
            });

            // Update device status based on command result
            if ((command.command === 'restart' || command.command === 'reboot') && result.status === CommandStatus.COMPLETED) {
                await tenantPrisma.client.device.update({
                    where: {id: device.id},
                    data: {
                        status: 'OFFLINE',
                        updatedAt: new Date()
                    }
                });
            }

            logger.info(`Command ${command.id} executed on device ${device.hostname} with status ${result.status}`);
        } catch (error) {
            logger.error(`Error executing command ${command.id} on device ${device.hostname}: ${error}`);

            // Update command with error
            await tenantPrisma.client.deviceCommand.update({
                where: {id: command.id},
                data: {
                    status: CommandStatus.FAILED,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    updatedAt: new Date()
                }
            });
        }
    }

    /**
     * Start processing the command queue
     */
    public startQueueProcessing(intervalMs: number = 60000): void {
        if (this.queueCheckInterval) {
            clearInterval(this.queueCheckInterval);
        }

        this.queueCheckInterval = setInterval(async () => {
            try {
                // Find online devices with pending commands
                const devices = await tenantPrisma.client.device.findMany({
                    where: {
                        status: 'ONLINE',
                        commands: {
                            some: {
                                status: CommandStatus.PENDING
                            }
                        }
                    },
                    include: {
                        commands: {
                            where: {
                                status: CommandStatus.PENDING
                            },
                            orderBy: {
                                createdAt: 'asc'
                            }
                        }
                    }
                });

                // Process commands for each device
                for (const device of devices) {
                    for (const command of device.commands) {
                        await this.executeCommand(device, command);
                    }
                }
            } catch (error) {
                logger.error(`Error processing command queue: ${error}`);
            }
        }, intervalMs);

        logger.info(`Command queue processing started with interval ${intervalMs}ms`);
    }

    /**
     * Stop processing the command queue
     */
    public stopQueueProcessing(): void {
        if (this.queueCheckInterval) {
            clearInterval(this.queueCheckInterval);
            this.queueCheckInterval = null;
            logger.info('Command queue processing stopped');
        }
    }
}

// Export a singleton instance of the queue manager
export const commandQueue = CommandQueueManager.getInstance();

// Device capability detection service
export class DeviceCapabilityDetector {

    /**
     * Detect device capabilities based on device type and initial connection
     */
    static async detectCapabilities(device: {
        deviceType: string;
        architecture: string;
        deviceModel?: string;
        ipAddress?: string;
        tailscaleIp?: string;
    }): Promise<DeviceCapabilities> {

        const capabilities: DeviceCapabilities = {
            protocols: [],
            commands: [],
            features: [],
            restrictions: []
        };

        // Base capabilities by device type
        switch (device.deviceType) {
            case 'PI_ZERO':
                capabilities.protocols = ['ssh'];
                capabilities.commands = ['status', 'restart', 'reboot', 'update'];
                capabilities.features = ['monitoring', 'logging'];
                capabilities.restrictions = ['limited_resources'];
                capabilities.ssh = {
                    supported: true,
                    port: 22,
                    auth_methods: ['password', 'key']
                };
                break;

            case 'PI_3':
            case 'PI_4':
            case 'PI_5':
                capabilities.protocols = ['ssh', 'mqtt', 'http'];
                capabilities.commands = ['status', 'restart', 'reboot', 'update', 'ps', 'top', 'df'];
                capabilities.features = ['monitoring', 'logging', 'remote_access'];
                capabilities.ssh = {
                    supported: true,
                    port: 22,
                    auth_methods: ['password', 'key']
                };
                capabilities.mqtt = {
                    supported: true,
                    broker_required: false
                };
                break;

            case 'ORANGE_PI':
                capabilities.protocols = ['ssh', 'http'];
                capabilities.commands = ['status', 'restart', 'reboot', 'update'];
                capabilities.features = ['monitoring', 'logging'];
                capabilities.ssh = {
                    supported: true,
                    port: 22,
                    auth_methods: ['password', 'key']
                };
                break;

            case 'GENERIC':
                // Conservative capabilities for unknown devices
                capabilities.protocols = ['ssh'];
                capabilities.commands = ['status'];
                capabilities.features = ['monitoring'];
                capabilities.restrictions = ['read_only'];
                capabilities.ssh = {
                    supported: true,
                    port: 22,
                    auth_methods: ['password']
                };
                break;

            default:
                // Minimal capabilities for unknown devices
                capabilities.protocols = [];
                capabilities.commands = ['status'];
                capabilities.features = [];
                capabilities.restrictions = ['read_only'];
                break;
        }

        // Test actual connectivity if IP available
        if (device.ipAddress || device.tailscaleIp) {
            const sshAvailable = await DeviceCapabilityDetector.testSSHConnectivity(device);
            if (!sshAvailable) {
                capabilities.ssh = {supported: false};
                capabilities.protocols = capabilities.protocols.filter(p => p !== 'ssh');
            }
        }

        return capabilities;
    }

    /**
     * Test SSH connectivity to determine if SSH is actually available
     */
    private static async testSSHConnectivity(device: {
        ipAddress?: string;
        tailscaleIp?: string;
    }): Promise<boolean> {
        const host = device.tailscaleIp || device.ipAddress;
        if (!host) return false;

        try {
            // Simple TCP connection test to SSH port
            const {exec} = require('child_process');
            const {promisify} = require('util');
            const execAsync = promisify(exec);

            // Test if SSH port is open (timeout after 5 seconds)
            await execAsync(`timeout 5 bash -c "echo >/dev/tcp/${host}/22"`, {
                timeout: 6000
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Update device capabilities after successful command execution
     */
    static async updateCapabilitiesFromExecution(
        deviceId: string,
        command: string,
        protocol: string,
        success: boolean
    ): Promise<void> {
        // Get current device
        const device = await tenantPrisma.client.device.findUnique({
            where: {id: deviceId}
        });

        if (!device) return;

        const capabilities = getDeviceCapabilities(device);

        if (success) {
            // Add successful command to capabilities
            if (!capabilities.commands.includes(command)) {
                capabilities.commands.push(command);
            }

            // Add successful protocol
            if (!capabilities.protocols.includes(protocol)) {
                capabilities.protocols.push(protocol);
            }
        } else {
            // Remove failed command from capabilities
            capabilities.commands = capabilities.commands.filter(c => c !== command);

            // If this was the only way to use this protocol, mark it as unsupported
            if (protocol === 'ssh' && !capabilities.commands.some(c =>
                ['restart', 'reboot', 'update', 'status'].includes(c))) {
                capabilities.ssh = {supported: false};
            }
        }

        // Update device capabilities
        // Use type assertion to bypass TypeScript check
        const updateData: any = {capabilities};
        await tenantPrisma.client.device.update({
            where: {id: deviceId},
            data: updateData
        });
    }
}

// Usage in device registration
export async function registerDevice(deviceData: any) {
    // Detect capabilities
    const capabilities = await DeviceCapabilityDetector.detectCapabilities(deviceData);

    // Create device with capabilities
    const device = await tenantPrisma.client.device.create({
        data: {
            ...deviceData,
            capabilities
        }
    });

    return device;
}
