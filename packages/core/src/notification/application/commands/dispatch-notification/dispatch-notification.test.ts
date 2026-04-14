import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchNotificationHandler } from './dispatch-notification.handler';
import { DispatchNotificationCommand } from './dispatch-notification.command';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { TenantContextImpl } from '@iotpilot/core/shared/application/context/tenant-context.vo';

const CUSTOMER_ID = 'c1234567890123456789012345';

class MockRepo { save = vi.fn(); findById = vi.fn(); findPaginated = vi.fn(); }
class MockBus { publish = vi.fn(); publishAll = vi.fn(); subscribe = vi.fn(); }

describe('DispatchNotificationHandler', () => {
  let handler: DispatchNotificationHandler;
  let repo: MockRepo;
  let bus: MockBus;
  let tenantCtx: TenantContextImpl;

  beforeEach(() => {
    repo = new MockRepo();
    bus = new MockBus();
    handler = new DispatchNotificationHandler(repo as any, bus as any);
    tenantCtx = TenantContextImpl.create(CustomerId.create(CUSTOMER_ID));
  });

  it('creates a PENDING record and publishes NotificationDispatchedEvent', async () => {
    repo.save.mockResolvedValue(undefined);
    bus.publish.mockResolvedValue(undefined);

    const cmd = DispatchNotificationCommand.create({
      customerId: CUSTOMER_ID,
      userId: 'user-1',
      type: 'ALERT_TRIGGERED',
      channel: 'EMAIL',
      recipient: 'test@example.com',
      subject: 'Alert triggered',
      body: 'Your device has an alert.',
      sourceEventId: 'evt-abc',
      sourceEntityId: 'alert-xyz',
      tenantContext: tenantCtx,
    });

    const id = await handler.handle(cmd);

    expect(typeof id).toBe('string');
    expect(repo.save).toHaveBeenCalledOnce();
    const saved = repo.save.mock.calls[0][0];
    expect(saved.status.value).toBe('PENDING');
    expect(bus.publish).toHaveBeenCalledOnce();
  });

  it('uses default maxAttempts of 3', async () => {
    repo.save.mockResolvedValue(undefined);
    bus.publish.mockResolvedValue(undefined);

    const cmd = DispatchNotificationCommand.create({
      customerId: CUSTOMER_ID,
      userId: null,
      type: 'DEVICE_OFFLINE',
      channel: 'SLACK',
      recipient: 'https://hooks.slack.com/test',
      subject: 'Device offline',
      body: 'Device is offline.',
      sourceEventId: 'evt-def',
      tenantContext: tenantCtx,
    });

    await handler.handle(cmd);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.maxAttempts.getValue()).toBe(3);
  });
});
