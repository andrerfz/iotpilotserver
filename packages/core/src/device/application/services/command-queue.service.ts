import {CommandExecutor} from '../../domain/interfaces/command-executor.interface';
import {DeviceRepository} from '../../domain/interfaces/device.repository';
import {DeviceCommandRepository} from '../../domain/interfaces/device-command-repository.interface';
import {Device} from '../../domain/entities/device.entity';
import {CommandStatus, DeviceCommand} from '../../domain/entities/device-command.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import {SSHCommandExecutorService} from '../../infrastructure/services/ssh-command-executor.service';
import {PrismaDeviceRepository} from '../../infrastructure/repositories/prisma-device.repository';
import {MQTTCommandExecutorService} from '../../infrastructure/services/mqtt-command-executor.service';
// PrismaCommandStatus type - matches Prisma schema enum
type PrismaCommandStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

/**
 * Maps domain CommandStatus enum to Prisma CommandStatus string literal
 */
function mapCommandStatusToPrisma(status: CommandStatus): PrismaCommandStatus {
    const statusMap: Record<CommandStatus, PrismaCommandStatus> = {
        [CommandStatus.PENDING]: 'PENDING',
        [CommandStatus.EXECUTING]: 'RUNNING',
        [CommandStatus.RUNNING]: 'RUNNING',
        [CommandStatus.COMPLETED]: 'COMPLETED',
        [CommandStatus.FAILED]: 'FAILED',
        [CommandStatus.TIMEOUT]: 'TIMEOUT'
    };
    return statusMap[status];
}

/**
 * Command Queue Service
 * Manages a queue of commands for offline devices and processes them when devices come online
 * This is an application service that orchestrates command execution using repositories and executors
 */
export class CommandQueueService {
    private static instance: CommandQueueService;
    private queueCheckInterval: NodeJS.Timeout | null = null;
    private executors: CommandExecutor[] = [];
    private readonly logger = StructuredLogger.forService('command-queue');

    private constructor(
        private readonly deviceRepository: DeviceRepository,
        private readonly deviceCommandRepository: DeviceCommandRepository
    ) {
        // TOFU callback: store SSH host key fingerprint after first successful connect
        const storeHostKey = deviceRepository instanceof PrismaDeviceRepository
            ? (id: string, fp: string) => (deviceRepository as PrismaDeviceRepository).updateSshHostKey(id, fp)
            : undefined;

        this.executors = [
            new SSHCommandExecutorService(undefined, storeHostKey),
            new MQTTCommandExecutorService()
        ];
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(
        deviceRepository: DeviceRepository,
        deviceCommandRepository: DeviceCommandRepository
    ): CommandQueueService {
        if (!CommandQueueService.instance) {
            CommandQueueService.instance = new CommandQueueService(
                deviceRepository,
                deviceCommandRepository
            );
        }
        return CommandQueueService.instance;
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
            // Get the device and command from repositories
            const deviceIdVO = DeviceId.create(deviceId);
            const device = await this.deviceRepository.findById(deviceIdVO);
            const command = await this.deviceCommandRepository.findById(commandId);

            if (!device || !command) {
                this.logger.error(`Device or command not found: ${deviceId}, ${commandId}`);
                return;
            }

            // If device is online, execute immediately
            if (device.isOnline()) {
                await this.executeCommand(device, command);
            } else {
                // Otherwise, leave it in the queue (it's already in PENDING state)
                this.logger.info(`Device ${device.name.getValue()} is offline, command ${command.id} queued for later execution`);
            }
        } catch (error) {
            this.logger.error(`Error in executeOrQueue: ${error instanceof Error ? error.message : String(error)}`, {
                deviceId,
                commandId
            }, error instanceof Error ? error : new Error(String(error)));
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
                this.logger.error(`No suitable executor found for device ${device.name.getValue()}`);
                command.markAsFailed('No suitable executor found for this device');
                await this.deviceCommandRepository.update(command);
                return;
            }

            // Update command status to RUNNING
            command.markAsExecuting();
            await this.deviceCommandRepository.update(command);

            // Execute the command
            const result = await executor.execute(device, command);

            // Update command with result
            if (result.status === CommandStatus.COMPLETED) {
                command.markAsCompleted(result.output || '');
            } else if (result.status === CommandStatus.FAILED || result.status === CommandStatus.TIMEOUT) {
                command.markAsFailed(result.error || 'Command execution failed');
            } else {
                // For other statuses, we need to create a new command with updated status
                // This is a limitation - we should add more methods to DeviceCommand
                command.markAsExecuting();
            }
            await this.deviceCommandRepository.update(command);

            // Update device status based on command result
            if ((command.command === 'restart' || command.command === 'reboot') && result.status === CommandStatus.COMPLETED) {
                // Device will go offline after restart/reboot
                // This should be handled by the device status update logic
                // For now, we'll just log it
                this.logger.info(`Device ${device.name.getValue()} will go offline after ${command.command}`);
            }

            this.logger.info(`Command ${command.id} executed on device ${device.name.getValue()} with status ${result.status}`);
        } catch (error) {
            this.logger.error(`Error executing command ${command.id} on device ${device.name.getValue()}: ${error instanceof Error ? error.message : String(error)}`, {
                deviceId: device.getId().getValue(),
                commandId: command.id
            }, error instanceof Error ? error : new Error(String(error)));

            // Update command with error
            command.markAsFailed(error instanceof Error ? error.message : 'Unknown error');
            await this.deviceCommandRepository.update(command);
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
                const onlineDevices = await this.deviceRepository.findOnlineDevices();

                // Process commands for each device
                for (const device of onlineDevices) {
                    const pendingCommands = await this.deviceCommandRepository.findPendingByDeviceId(device.getId());

                    // Process each pending command
                    for (const command of pendingCommands) {
                        await this.executeCommand(device, command);
                    }
                }
            } catch (error) {
                this.logger.error(`Error processing command queue: ${error instanceof Error ? error.message : String(error)}`, {}, error instanceof Error ? error : new Error(String(error)));
            }
        }, intervalMs);

        this.logger.info(`Command queue processing started with interval ${intervalMs}ms`);
    }

    /**
     * Stop processing the command queue
     */
    public stopQueueProcessing(): void {
        if (this.queueCheckInterval) {
            clearInterval(this.queueCheckInterval);
            this.queueCheckInterval = null;
            this.logger.info('Command queue processing stopped');
        }
    }
}

