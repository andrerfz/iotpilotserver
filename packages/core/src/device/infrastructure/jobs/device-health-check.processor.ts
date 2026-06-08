import type { JobData, JobProcessor, JobResult } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';
import {ServiceContainer} from '@iotpilot/core/shared/infrastructure/container/service-container';

/**
 * Checks if a disconnected device has come back online.
 * Runs after a 30-second delay to allow reconnection.
 * If still offline, triggers a broadcast update.
 */
export class DeviceHealthCheckProcessor implements JobProcessor {
  readonly jobType = 'device-health-check';

  async process(data: JobData): Promise<JobResult> {
    const { deviceId, deviceName, wasGraceful, disconnectionReason } = data.payload;

    console.log(
      `[DeviceHealthCheckProcessor] Checking device: ${deviceName} (${deviceId}) ` +
      `graceful=${wasGraceful} reason=${disconnectionReason ?? 'none'} tenant=${data.tenantId}`
    );

    // Check current device status via Prisma
    let isOnline = false;
    try {
      const prisma = ServiceContainer.getInstance().getPrismaClient();
      const device = await prisma.getClient().device.findUnique({
        where: { id: String(deviceId) },
        select: { status: true },
      });
      isOnline = device?.status === 'ONLINE';
    } catch (err) {
      console.warn(`[DeviceHealthCheckProcessor] Failed to check device status: ${(err as Error).message}`);
    }

    if (typeof global !== 'undefined' && (global as any).broadcastDeviceUpdate) {
      (global as any).broadcastDeviceUpdate(deviceId, {
        type: 'health-check',
        deviceName,
        wasGraceful,
        isOnline,
        checkedAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      data: {
        deviceId,
        deviceName,
        isOnline,
        checkedAt: new Date().toISOString(),
        wasGraceful,
      },
    };
  }
}
