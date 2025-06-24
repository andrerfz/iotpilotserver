import { Device, DeviceCommand, CommandStatus } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as ssh2 from 'ssh2';
import * as mqtt from 'mqtt';
import { tenantPrisma } from '@/lib/tenant-middleware';
import { logger } from './logger';

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
  private readonly sshConfig: ssh2.ConnectConfig;
  
  constructor(config?: Partial<ssh2.ConnectConfig>) {
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
    // Can handle if device has an IP address
    return !!device.ipAddress || !!device.tailscaleIp;
  }

  async execute(device: Device, command: DeviceCommand): Promise<CommandExecutionResult> {
    // Use tailscale IP if available, otherwise use regular IP
    const host = device.tailscaleIp || device.ipAddress;
    
    if (!host) {
      return {
        status: CommandStatus.FAILED,
        error: 'No IP address available for SSH connection',
        exitCode: 1
      };
    }

    // Log the execution attempt
    logger.info(`Executing command via SSH on device ${device.hostname} (${host}): ${command.command} ${command.arguments || ''}`);

    // Create SSH connection config for this specific device
    const config: ssh2.ConnectConfig = {
      ...this.sshConfig,
      host
    };

    return new Promise((resolve) => {
      const conn = new ssh2.Client();
      
      // Handle connection errors
      conn.on('error', (err) => {
        logger.error(`SSH connection error to ${host}: ${err.message}`);
        resolve({
          status: CommandStatus.FAILED,
          error: `SSH connection error: ${err.message}`,
          exitCode: 1
        });
      });

      // Set connection timeout
      const timeout = setTimeout(() => {
        conn.end();
        logger.error(`SSH connection timeout to ${host}`);
        resolve({
          status: CommandStatus.TIMEOUT,
          error: 'SSH connection timeout',
          exitCode: 1
        });
      }, 15000); // 15 second timeout

      conn.on('ready', () => {
        clearTimeout(timeout);
        logger.debug(`SSH connection established to ${host}`);
        
        // Execute the command
        const cmd = `${command.command} ${command.arguments || ''}`.trim();
        conn.exec(cmd, (err, stream) => {
          if (err) {
            conn.end();
            logger.error(`SSH exec error on ${host}: ${err.message}`);
            resolve({
              status: CommandStatus.FAILED,
              error: `SSH exec error: ${err.message}`,
              exitCode: 1
            });
            return;
          }

          let output = '';
          let errorOutput = '';

          stream.on('data', (data: Buffer) => {
            output += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString();
          });

          stream.on('close', (code: number) => {
            conn.end();
            logger.info(`Command executed on ${host} with exit code ${code}`);
            
            resolve({
              status: code === 0 ? CommandStatus.COMPLETED : CommandStatus.FAILED,
              output: output.trim(),
              error: errorOutput.trim(),
              exitCode: code
            });
          });
        });
      });

      // Connect to the device
      conn.connect(config);
    });
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
    // Can handle if device has MQTT capability (for now, assume all online devices do)
    return device.status === 'ONLINE';
  }

  async execute(device: Device, command: DeviceCommand): Promise<CommandExecutionResult> {
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
        client.subscribe(responseTopic, { qos: this.mqttConfig.qos }, (err) => {
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
          client.publish(commandTopic, JSON.stringify(message), { qos: this.mqttConfig.qos }, (err) => {
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
        where: { id: deviceId }
      });

      const command = await tenantPrisma.client.deviceCommand.findUnique({
        where: { id: commandId }
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
          where: { id: command.id },
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
        where: { id: command.id },
        data: {
          status: CommandStatus.RUNNING,
          executedAt: new Date()
        }
      });

      // Execute the command
      const result = await executor.execute(device, command);

      // Update command with result
      await tenantPrisma.client.deviceCommand.update({
        where: { id: command.id },
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
          where: { id: device.id },
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
        where: { id: command.id },
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