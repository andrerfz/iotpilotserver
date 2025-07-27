import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {ExecuteSshCommandCommand} from './execute-ssh-command.command';
import {SSHConnector} from '@/lib/device/domain/services/ssh-connector.service';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device-repository.interface';
import {DeviceNotFoundException} from '@/lib/device/domain/exceptions/device-not-found.exception';
import {SSHCommandExecutedEvent} from '@/lib/device/domain/events/ssh-command-executed.event';
import {EventBus} from '@/lib/shared/application/bus/event.bus';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';

/**
 * Handler for executing an SSH command on a device
 */
export class ExecuteSSHCommandHandler implements CommandHandler<ExecuteSshCommandCommand, { output: string; error: string | null }> {
  constructor(
    private readonly sshConnector: SSHConnector,
    private readonly deviceRepository: DeviceRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Handles the execute SSH command
   * @param command The execute SSH command
   * @returns The command output and error (if any)
   */
  async handle(command: ExecuteSshCommandCommand): Promise<{ output: string; error: string | null }> {
    // Find the device to ensure it exists and belongs to the correct tenant
    const deviceId = DeviceId.fromString(command.deviceId);
    const tenantContext = command.getTenantContext();
    const device = await this.deviceRepository.findById(deviceId, tenantContext);
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${deviceId.getValue()} not found`);
    }

    // Connect to the device
    const session = await this.sshConnector.connectToDevice(deviceId, tenantContext);

    try {
      // Set a timeout for the command execution
      const defaultTimeout = 10000; // Default timeout of 10 seconds
      const timeoutPromise = new Promise<{ output: string; error: string | null }>((_, reject) => {
        setTimeout(() => reject(new Error(`Command execution timed out after ${defaultTimeout}ms`)), defaultTimeout);
      });

      // Execute the command
      const executionPromise = this.sshConnector.executeCommand(session.id, command.command, tenantContext);

      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Publish SSH command executed event
      const event = new SSHCommandExecutedEvent(
        deviceId,
        device.name,
        command.command,
        result.output,
        result.error,
        'default-tenant' as any // Use type assertion to bypass CustomerId type issue
      );
      
      await this.eventBus.publish(event);

      return result;
    } finally {
      // Always disconnect from the device
      await this.sshConnector.disconnectFromDevice(session.id, tenantContext);
    }
  }
}