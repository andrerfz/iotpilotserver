import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationRoutingService } from './notification-routing.service';
import { NotificationPreferenceRepository } from '../interfaces/notification-preference.repository';
import { NotificationTargetRepository } from '../interfaces/notification-target.repository';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';

const makePreference = (channel: string, enabled: boolean, destination?: string) => ({
  channel: NotificationChannel.fromString(channel),
  enabled,
  destination: destination ? { getValue: () => destination } : null,
});

const mockRepo = (): NotificationPreferenceRepository => ({
  findByUserAndType: vi.fn(),
  findByUser: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
});

// Default: every toggle unset (null) — the service treats that as "allowed".
const mockTargetRepo = (): NotificationTargetRepository => ({
  findAdminUsersInTenant: vi.fn().mockResolvedValue([]),
  getUserNotificationToggle: vi.fn().mockResolvedValue(null),
});

const CUSTOMER_ID = CustomerId.create('cltestcustomer0000000000001');
const USER_ID = 'user-1';
const USER_EMAIL = 'user@example.com';

describe('NotificationRoutingService', () => {
  let repo: ReturnType<typeof mockRepo>;
  let targetRepo: ReturnType<typeof mockTargetRepo>;
  let service: NotificationRoutingService;

  beforeEach(() => {
    repo = mockRepo();
    targetRepo = mockTargetRepo();
    service = new NotificationRoutingService(repo, targetRepo);
  });

  it('returns explicit enabled preferences when they exist', async () => {
    vi.mocked(repo.findByUserAndType).mockResolvedValue([
      makePreference('EMAIL', true, 'custom@example.com'),
      makePreference('SLACK', true),
    ] as any);

    const routes = await service.resolveRoutes(NotificationType.ALERT_TRIGGERED, CUSTOMER_ID, USER_ID, USER_EMAIL);

    expect(routes).toHaveLength(2);
    expect(routes[0]).toEqual({ userId: USER_ID, channel: 'EMAIL', destination: 'custom@example.com' });
    expect(routes[1]).toEqual({ userId: USER_ID, channel: 'SLACK', destination: USER_EMAIL });
  });

  it('filters out disabled preferences', async () => {
    vi.mocked(repo.findByUserAndType).mockResolvedValue([
      makePreference('EMAIL', false),
      makePreference('SLACK', true),
    ] as any);

    const routes = await service.resolveRoutes(NotificationType.ALERT_TRIGGERED, CUSTOMER_ID, USER_ID, USER_EMAIL);

    expect(routes).toHaveLength(1);
    expect(routes[0].channel).toBe('SLACK');
  });

  describe('ADR-009 fallback — critical types with no preference', () => {
    beforeEach(() => {
      vi.mocked(repo.findByUserAndType).mockResolvedValue([]);
    });

    it('generates synthetic EMAIL route for ALERT_TRIGGERED', async () => {
      const routes = await service.resolveRoutes(NotificationType.ALERT_TRIGGERED, CUSTOMER_ID, USER_ID, USER_EMAIL);

      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual({ userId: USER_ID, channel: 'EMAIL', destination: USER_EMAIL });
    });

    it('generates synthetic EMAIL route for DEVICE_OFFLINE', async () => {
      const routes = await service.resolveRoutes(NotificationType.DEVICE_OFFLINE, CUSTOMER_ID, USER_ID, USER_EMAIL);

      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual({ userId: USER_ID, channel: 'EMAIL', destination: USER_EMAIL });
    });

    it('does NOT generate fallback for non-critical types', async () => {
      const routes = await service.resolveRoutes(NotificationType.DEVICE_ONLINE, CUSTOMER_ID, USER_ID, USER_EMAIL);

      expect(routes).toHaveLength(0);
    });

    it('does NOT generate fallback when userEmail is null', async () => {
      const routes = await service.resolveRoutes(NotificationType.ALERT_TRIGGERED, CUSTOMER_ID, USER_ID, null);

      expect(routes).toHaveLength(0);
    });

    it('does NOT apply fallback when explicit preferences exist (even if all disabled)', async () => {
      // A user who explicitly opted out should not get the fallback
      vi.mocked(repo.findByUserAndType).mockResolvedValue([
        makePreference('EMAIL', false),
      ] as any);

      const routes = await service.resolveRoutes(NotificationType.ALERT_TRIGGERED, CUSTOMER_ID, USER_ID, USER_EMAIL);

      expect(routes).toHaveLength(0);
    });
  });

  describe('channel-level master toggle', () => {
    beforeEach(() => {
      // No explicit per-type preferences — routes come from the ADR-009 fallback (EMAIL).
      vi.mocked(repo.findByUserAndType).mockResolvedValue([]);
    });

    it('suppresses the EMAIL fallback route when emailNotifications is off', async () => {
      vi.mocked(targetRepo.getUserNotificationToggle).mockImplementation(async (_userId, key) =>
        key === 'emailNotifications' ? 'false' : null,
      );

      const routes = await service.resolveRoutes(NotificationType.ALERT_TRIGGERED, CUSTOMER_ID, USER_ID, USER_EMAIL);

      expect(routes).toHaveLength(0);
    });

    it('keeps a PUSH preference route when pushNotifications is on (default)', async () => {
      vi.mocked(repo.findByUserAndType).mockResolvedValue([
        makePreference('PUSH', true, 'device-token'),
      ] as any);

      const routes = await service.resolveRoutes(NotificationType.ALERT_TRIGGERED, CUSTOMER_ID, USER_ID, USER_EMAIL);

      expect(routes).toHaveLength(1);
      expect(routes[0].channel).toBe('PUSH');
    });

    it('drops a PUSH preference route when pushNotifications is off', async () => {
      vi.mocked(repo.findByUserAndType).mockResolvedValue([
        makePreference('PUSH', true, 'device-token'),
      ] as any);
      vi.mocked(targetRepo.getUserNotificationToggle).mockImplementation(async (_userId, key) =>
        key === 'pushNotifications' ? 'false' : null,
      );

      const routes = await service.resolveRoutes(NotificationType.ALERT_TRIGGERED, CUSTOMER_ID, USER_ID, USER_EMAIL);

      expect(routes).toHaveLength(0);
    });

    it('does not consult the channel toggle for channels without a master switch (e.g. SLACK)', async () => {
      vi.mocked(repo.findByUserAndType).mockResolvedValue([
        makePreference('SLACK', true),
      ] as any);

      const routes = await service.resolveRoutes(NotificationType.ALERT_TRIGGERED, CUSTOMER_ID, USER_ID, USER_EMAIL);

      expect(routes).toHaveLength(1);
      expect(routes[0].channel).toBe('SLACK');
    });
  });
});
