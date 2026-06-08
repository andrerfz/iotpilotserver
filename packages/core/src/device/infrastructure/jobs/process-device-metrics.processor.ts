import type { JobData, JobProcessor, JobResult } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { AppContainer } from '@iotpilot/core/shared/infrastructure/container/app-container';
import { DeviceId } from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { TenantContextImpl } from '@iotpilot/core/shared/application/context/tenant-context.vo';
import { CreateAlertCommand } from '@iotpilot/core/monitoring/application/commands/create-alert/create-alert.command';
import type { ThresholdRepository } from '@iotpilot/core/monitoring/domain/interfaces/threshold-repository.interface';

/**
 * Processes device metrics for storage and threshold evaluation.
 * Stores metrics as DeviceMetric rows via Prisma, then checks all applicable
 * thresholds and fires CreateAlertCommand for any that are breached.
 */
export class ProcessDeviceMetricsProcessor implements JobProcessor {
  readonly jobType = 'process-device-metrics';

  async process(data: JobData): Promise<JobResult> {
    const {
      deviceId,
      deviceName,
      cpuUsage,
      memoryUsage,
      diskUsage,
      temperature,
      networkTraffic,
      collectionTimestamp,
      hasAlerts,
    } = data.payload;

    console.log(
      `[ProcessDeviceMetricsProcessor] Processing metrics for ${deviceName} (${deviceId}): ` +
      `cpu=${cpuUsage}% mem=${memoryUsage}% disk=${diskUsage}% temp=${temperature ?? 'N/A'}C ` +
      `network=${networkTraffic} hasAlerts=${hasAlerts} tenant=${data.tenantId}`
    );

    const metricsToProcess = [
      cpuUsage != null && { name: 'cpu_usage', value: cpuUsage as number, unit: '%' },
      memoryUsage != null && { name: 'memory_usage', value: memoryUsage as number, unit: '%' },
      diskUsage != null && { name: 'disk_usage', value: diskUsage as number, unit: '%' },
      temperature != null && { name: 'cpu_temp', value: temperature as number, unit: '°C' },
    ].filter(Boolean) as { name: string; value: number; unit: string }[];

    // Store metrics
    try {
      const prisma = ServiceContainer.getInstance().getPrismaClient();
      const timestamp = collectionTimestamp ? new Date(String(collectionTimestamp)) : new Date();

      if (metricsToProcess.length > 0) {
        await prisma.getClient().deviceMetric.createMany({
          data: metricsToProcess.map(m => ({
            deviceId: String(deviceId),
            metric: m.name,
            value: m.value,
            unit: m.unit,
            timestamp,
          })),
        });
      }
    } catch (err) {
      console.warn(`[ProcessDeviceMetricsProcessor] Failed to store metrics: ${(err as Error).message}`);
    }

    // Evaluate thresholds and create alerts for any breaches
    try {
      const thresholdRepo = AppContainer.resolve<ThresholdRepository>('ThresholdRepository');
      const commandBus = ServiceContainer.getInstance().getCommandBus();
      const tenantId = CustomerId.create(data.tenantId);
      const devId = DeviceId.create(String(deviceId));
      const tenantContext = TenantContextImpl.create(tenantId);

      const thresholds = await thresholdRepo.findApplicableThresholds(devId, tenantId);
      let breachCount = 0;

      for (const metric of metricsToProcess) {
        const applicable = thresholds.filter(t => t.metricName === metric.name && t.isEnabled());
        for (const threshold of applicable) {
          if (threshold.evaluateMetric(metric.value)) {
            breachCount++;
            await commandBus.execute(CreateAlertCommand.create(
              String(deviceId),
              threshold.id.getValue(),
              `${threshold.name}: ${metric.name} threshold breached`,
              `${metric.name} is ${metric.value}${metric.unit}, threshold is ${threshold.value}${metric.unit} (${threshold.operator})`,
              threshold.severity.value,
              {
                metricName: metric.name,
                metricValue: metric.value,
                metricUnit: metric.unit,
                thresholdValue: threshold.value,
              },
              data.tenantId,
              tenantContext,
            ));
          }
        }
      }

      if (breachCount > 0) {
        console.log(`[ProcessDeviceMetricsProcessor] ${breachCount} threshold breach(es) for device=${deviceId}`);
      }
    } catch (err) {
      console.warn(`[ProcessDeviceMetricsProcessor] Threshold evaluation failed: ${(err as Error).message}`);
    }

    return {
      success: true,
      data: {
        deviceId,
        cpuUsage,
        memoryUsage,
        diskUsage,
        processedAt: new Date().toISOString(),
      },
    };
  }
}
