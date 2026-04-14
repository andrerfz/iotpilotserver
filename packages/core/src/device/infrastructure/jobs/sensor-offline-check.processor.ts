import type { JobData, JobProcessor, JobResult } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { MarkStaleDevicesOfflineCommand } from '@iotpilot/core/device/application/commands/mark-stale-devices-offline/mark-stale-devices-offline.command';
import type { MarkStaleDevicesOfflineResult } from '@iotpilot/core/device/application/commands/mark-stale-devices-offline/mark-stale-devices-offline.handler';

/**
 * BullMQ job processor that dispatches MarkStaleDevicesOfflineCommand.
 * The actual business logic lives in the handler, not here.
 *
 * Equivalent to Laravel: $schedule->command('device:mark-stale-offline')->everyThirtyMinutes()
 */
export class SensorOfflineCheckProcessor implements JobProcessor {
    readonly jobType = 'sensor-offline-check';

    async process(_data: JobData): Promise<JobResult> {
        const commandBus = ServiceContainer.getInstance().getCommandBus();
        const command = MarkStaleDevicesOfflineCommand.create();

        const result = await commandBus.execute<MarkStaleDevicesOfflineCommand, MarkStaleDevicesOfflineResult>(command);

        return {
            success: true,
            data: result,
        };
    }
}
