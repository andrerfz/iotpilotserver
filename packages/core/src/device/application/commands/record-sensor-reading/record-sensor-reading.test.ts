import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordSensorReadingHandler } from './record-sensor-reading.handler';
import { RecordSensorReadingCommand } from './record-sensor-reading.command';

const DEVICE = {
  id: 'device-internal-id',
  deviceId: 'device-biz-id',
  hostname: 'freezer-1',
  name: null,
  userId: 'user-1',
  customerId: 'cnmapo7auxgbpzt08o3d88q07',
  status: 'ONLINE',
};

function makePrisma(overrides: Partial<Record<string, unknown>> = {}) {
  const alert = {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'alert-1', title: 'Freezer Temperature Warning', message: 'msg' }),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({}),
  };
  const client = {
    device: {
      findFirst: vi.fn().mockResolvedValue(DEVICE),
      update: vi.fn().mockResolvedValue(DEVICE),
    },
    deviceMetric: { createMany: vi.fn().mockResolvedValue({}) },
    threshold: { findMany: vi.fn().mockResolvedValue([]) },
    alert,
    ...overrides,
  };
  return { getClient: () => client } as any;
}

function makeTenantContext() {
  return {
    getCustomerId: () => ({ getValue: () => 'cnmapo7auxgbpzt08o3d88q07' }),
    isSuperAdminUser: () => false,
  };
}

function makeCommand(data: Record<string, unknown>) {
  return {
    data,
    getTenantContext: () => makeTenantContext(),
  } as unknown as RecordSensorReadingCommand;
}

describe('RecordSensorReadingHandler — alert notifications', () => {
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
  });

  it('publishes a valid AlertSeverity for a WARNING-level temperature alert (regression: WARNING is not a valid AlertSeverity value)', async () => {
    const prisma = makePrisma();
    const handler = new RecordSensorReadingHandler(prisma, eventBus as any);

    await handler.handle(makeCommand({
      deviceId: 'device-biz-id',
      readings: [{ temperature: -10 }],
      alertPending: true,
      alertTemp: -10,
    }));

    expect(eventBus.publish).toHaveBeenCalledOnce();
    const published = eventBus.publish.mock.calls[0][0];
    // AlertSeverity.fromString would have thrown for 'WARNING' — getValue() being
    // reachable at all proves the mapping succeeded instead of being swallowed.
    expect(published.severity.getValue()).toBe('MEDIUM');
  });

  it('publishes CRITICAL as-is for a critical temperature alert', async () => {
    const prisma = makePrisma();
    const handler = new RecordSensorReadingHandler(prisma, eventBus as any);

    await handler.handle(makeCommand({
      deviceId: 'device-biz-id',
      readings: [{ temperature: 0 }],
      alertPending: true,
      alertTemp: 0,
    }));

    const published = eventBus.publish.mock.calls[0][0];
    expect(published.severity.getValue()).toBe('CRITICAL');
  });

  it('notifies again when an existing WARNING alert escalates to CRITICAL', async () => {
    const prisma = makePrisma({
      alert: {
        findFirst: vi.fn().mockResolvedValue({ id: 'alert-1', severity: 'WARNING' }),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({}),
      },
    });
    const handler = new RecordSensorReadingHandler(prisma, eventBus as any);

    await handler.handle(makeCommand({
      deviceId: 'device-biz-id',
      readings: [{ temperature: 0 }],
      alertPending: true,
      alertTemp: 0,
    }));

    expect(eventBus.publish).toHaveBeenCalledOnce();
    expect(prisma.getClient().alert.update).toHaveBeenCalledOnce();
  });

  it('never throws ingestion-fatally when the event bus itself throws', async () => {
    const prisma = makePrisma();
    eventBus.publish.mockRejectedValue(new Error('boom'));
    const handler = new RecordSensorReadingHandler(prisma, eventBus as any);

    await expect(handler.handle(makeCommand({
      deviceId: 'device-biz-id',
      readings: [{ temperature: -10 }],
      alertPending: true,
      alertTemp: -10,
    }))).resolves.toMatchObject({ alertCreated: true });
  });
});
