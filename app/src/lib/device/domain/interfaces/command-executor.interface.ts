import {Device} from '../entities/device.entity';
import {CommandStatus, DeviceCommand} from '../entities/device-command.entity';

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

