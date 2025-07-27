/// <reference types="node" />
import * as mqtt from 'mqtt';
import {CommandExecutionResult, CommandExecutor} from '../../domain/interfaces/command-executor.interface';
import {Device} from '../../domain/entities/device.entity';
import {CommandStatus, DeviceCommand} from '../../domain/entities/device-command.entity';
import {StructuredLogger} from '@/lib/shared/infrastructure/logging/structured-logger';

/**
 * Device capabilities interface
 */
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

/**
 * Helper function to get device capabilities
 */
function getDeviceCapabilities(device: Device): DeviceCapabilities {
    try {
        const deviceWithCapabilities = device as Device & {
            capabilities?: any
        };
        return deviceWithCapabilities.capabilities || {
            protocols: [],
            commands: [],
            features: []
        };
    } catch {
        return {
            protocols: [],
            commands: [],
            features: []
        };
    }
}

/**
 * MQTT Command Executor Service
 * Executes commands via MQTT for devices that support it
 */
export class MQTTCommandExecutorService implements CommandExecutor {
    private readonly logger = StructuredLogger.forService('mqtt-command-executor');
    private readonly mqttConfig: {
        brokerUrl: string;
        username?: string;
        password?: string;
        commandTopic: string;
        responseTopic: string;
        qos: 0 | 1 | 2;
        timeout: number;
    };

    constructor(config?: Partial<typeof MQTTCommandExecutorService.prototype.mqttConfig>) {
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
        const isOnline = device.isOnline();

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
        this.logger.info(`Executing command via MQTT on device ${device.name.getValue()}: ${command.command} ${command.arguments || ''}`);

        // Create topic names for this specific device
        const deviceId = device.getId().getValue();
        const commandTopic = this.mqttConfig.commandTopic.replace('{deviceId}', deviceId);
        const responseTopic = this.mqttConfig.responseTopic.replace('{deviceId}', deviceId);

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
                this.logger.error(`MQTT command timeout for device ${deviceId}`);
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
                this.logger.error(`MQTT connection error: ${err.message}`);
                resolve({
                    status: CommandStatus.FAILED,
                    error: `MQTT connection error: ${err.message}`,
                    exitCode: 1
                });
            });

            // Handle successful connection
            client.on('connect', () => {
                this.logger.debug(`MQTT connected to broker for device ${deviceId}`);

                // Subscribe to response topic
                client.subscribe(responseTopic, {qos: this.mqttConfig.qos}, (err) => {
                    if (err) {
                        clearTimeout(timeout);
                        client.end();
                        this.logger.error(`MQTT subscription error: ${err.message}`);
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
                            this.logger.error(`MQTT publish error: ${err.message}`);
                            resolve({
                                status: CommandStatus.FAILED,
                                error: `MQTT publish error: ${err.message}`,
                                exitCode: 1
                            });
                        }
                        this.logger.debug(`Command published to ${commandTopic}`);
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

                            this.logger.info(`Received command response from device ${deviceId}`);

                            resolve({
                                status: response.success ? CommandStatus.COMPLETED : CommandStatus.FAILED,
                                output: response.output || '',
                                error: response.error || '',
                                exitCode: response.exitCode || (response.success ? 0 : 1)
                            });
                        }
                    } catch (err) {
                        this.logger.error(`Error parsing MQTT response: ${err}`);
                        // Continue waiting for a valid response
                    }
                }
            });
        });
    }
}

