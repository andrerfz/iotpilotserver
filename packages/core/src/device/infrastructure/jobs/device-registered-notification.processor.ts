import type { JobData, JobProcessor, JobResult } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

/**
 * Processes device registration notifications.
 * Logs the registration and could push Socket.IO events.
 */
export class DeviceRegisteredNotificationProcessor implements JobProcessor {
  readonly jobType = 'device-registered-notification';

  async process(data: JobData): Promise<JobResult> {
    const { deviceId, deviceName, ipAddress, status } = data.payload;

    console.log(
      `[DeviceRegisteredProcessor] Device registered: ${deviceName} (${deviceId}) ` +
      `ip=${ipAddress} status=${status} tenant=${data.tenantId}`
    );

    // Broadcast via Socket.IO global if available
    if (typeof global !== 'undefined' && (global as any).broadcastDeviceUpdate) {
      (global as any).broadcastDeviceUpdate(deviceId, {
        type: 'registered',
        deviceName,
        ipAddress,
        status,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      data: { deviceId, deviceName, notified: true },
    };
  }
}
