import { describe, it, expect, vi } from 'vitest';
import { GetSystemMetricsQuery } from './get-system-metrics.query';
import { GetSystemMetricsHandler } from './get-system-metrics.handler';
import { Metric } from '@iotpilot/core/monitoring/domain/entities/metric.entity';
import { MetricId } from '@iotpilot/core/monitoring/domain/value-objects/metric-id.vo';
import { MetricValue } from '@iotpilot/core/monitoring/domain/value-objects/metric-value.vo';
import { DeviceId } from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

const TENANT_ID = 'cnmapo7auxgbpzt08o3d88q07';

function makeMetric(deviceId: string, name: string, value: number): Metric {
  return Metric.create(
    MetricId.create(),
    DeviceId.create(deviceId),
    name,
    MetricValue.create(value, '%'),
    new Date(),
    new Map(),
    CustomerId.create(TENANT_ID),
  );
}

function makeHandler(metrics: Metric[]) {
  const metricsRepository = { findAll: vi.fn().mockResolvedValue(metrics) };
  const tenantValidator = { validateTenantAccess: vi.fn() };
  const handler = new GetSystemMetricsHandler(metricsRepository as any, tenantValidator as any);
  return { handler, metricsRepository };
}

describe('GetSystemMetricsHandler — deviceIds filter', () => {
  it('returns metrics from every device when no deviceIds filter is given', async () => {
    const metrics = [
      makeMetric('device-pi-1', 'cpu_usage', 10),
      makeMetric('device-pi-2', 'cpu_usage', 20),
    ];
    const { handler } = makeHandler(metrics);

    const result = await handler.handle(GetSystemMetricsQuery.create(TENANT_ID));

    expect(result.metrics).toHaveLength(2);
  });

  it('restricts results to the given deviceIds (fleet chart filtered by device type)', async () => {
    const metrics = [
      makeMetric('device-pi-1', 'cpu_usage', 10),
      makeMetric('device-pi-2', 'cpu_usage', 20),
      makeMetric('device-sensor-1', 'temperature', -18),
    ];
    const { handler } = makeHandler(metrics);

    const result = await handler.handle(
      GetSystemMetricsQuery.create(TENANT_ID, undefined, undefined, undefined, undefined, ['device-pi-1']),
    );

    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].deviceId.value).toBe('device-pi-1');
  });

  it('returns nothing when deviceIds is an empty array match set', async () => {
    const metrics = [makeMetric('device-pi-1', 'cpu_usage', 10)];
    const { handler } = makeHandler(metrics);

    const result = await handler.handle(
      GetSystemMetricsQuery.create(TENANT_ID, undefined, undefined, undefined, undefined, ['device-does-not-exist']),
    );

    expect(result.metrics).toHaveLength(0);
  });

  it('combines deviceIds and metricNames filters', async () => {
    const metrics = [
      makeMetric('device-pi-1', 'cpu_usage', 10),
      makeMetric('device-pi-1', 'memory_usage', 55),
    ];
    const { handler } = makeHandler(metrics);

    const result = await handler.handle(
      GetSystemMetricsQuery.create(TENANT_ID, undefined, undefined, ['cpu_usage'], undefined, ['device-pi-1']),
    );

    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].name).toBe('cpu_usage');
  });
});
