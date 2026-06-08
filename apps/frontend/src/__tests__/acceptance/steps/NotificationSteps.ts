import { expect } from 'vitest';
import { StepRegistry } from '../runtime/StepRegistry';
import { NotificationRecordRepository } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';
import { NotificationPreferenceRepository } from '@iotpilot/core/notification/domain/interfaces/notification-preference.repository';
import { NotificationRecordEntity } from '@iotpilot/core/notification/domain/entities/notification-record.entity';
import { NotificationRecordId } from '@iotpilot/core/notification/domain/value-objects/notification-record-id.vo';
import { NotificationDeliveryStatus } from '@iotpilot/core/notification/domain/value-objects/notification-delivery-status.vo';
import { NotificationAttemptCount } from '@iotpilot/core/notification/domain/value-objects/notification-attempt-count.vo';
import { NotificationMaxAttempts } from '@iotpilot/core/notification/domain/value-objects/notification-max-attempts.vo';
import { NotificationRecipient } from '@iotpilot/core/notification/domain/value-objects/notification-recipient.vo';
import { NotificationSubject } from '@iotpilot/core/notification/domain/value-objects/notification-subject.vo';
import { NotificationBody } from '@iotpilot/core/notification/domain/value-objects/notification-body.vo';
import { SourceEventId } from '@iotpilot/core/notification/domain/value-objects/source-event-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { CancelNotificationCommand } from '@iotpilot/core/notification/application/commands/cancel-notification/cancel-notification.command';
import { CancelNotificationHandler } from '@iotpilot/core/notification/application/commands/cancel-notification/cancel-notification.handler';
import { RetryNotificationCommand } from '@iotpilot/core/notification/application/commands/retry-notification/retry-notification.command';
import { RetryNotificationHandler } from '@iotpilot/core/notification/application/commands/retry-notification/retry-notification.handler';
import { UpdateNotificationPreferenceCommand } from '@iotpilot/core/notification/application/commands/update-notification-preference/update-notification-preference.command';
import { UpdateNotificationPreferenceHandler } from '@iotpilot/core/notification/application/commands/update-notification-preference/update-notification-preference.handler';
import { GetNotificationHistoryQuery } from '@iotpilot/core/notification/application/queries/get-notification-history/get-notification-history.query';
import { GetNotificationHistoryHandler } from '@iotpilot/core/notification/application/queries/get-notification-history/get-notification-history.handler';
import { GetNotificationRecordQuery } from '@iotpilot/core/notification/application/queries/get-notification-record/get-notification-record.query';
import { GetNotificationRecordHandler } from '@iotpilot/core/notification/application/queries/get-notification-record/get-notification-record.handler';
import { DomainException } from '@iotpilot/core/shared/domain/exceptions/domain.exception';
import type { EventBus } from '@iotpilot/core/shared/application/bus/event.bus';

// No-op event bus for tests — domain events are not under test here
const noopEventBus: EventBus = {
  publish: async () => {},
  subscribe: () => {},
};

const FIXED_SOURCE_EVENT_ID = 'src-ev-00-0000-0000-0000-000000000001';

export class NotificationSteps {
  // Maps domain outcomes to HTTP-equivalent status codes
  private lastOperationStatus: number | null = null;
  private lastListResult: any = null;

  constructor(
    private readonly recordRepo: NotificationRecordRepository,
    private readonly prefRepo: NotificationPreferenceRepository,
    private readonly customerId: string,
    private readonly userId: string,
  ) {}

  private tenantCtx() {
    return TenantContextImpl.create(CustomerId.create(this.customerId));
  }

  register(registry: StepRegistry): void {
    // ── Given ─────────────────────────────────────────────────────────────────

    registry.register('no prior state', async () => { /* nothing to seed */ });

    registry.register(
      'a notification "<id>" in PENDING status channel "<channel>" exists',
      async (ex) => {
        await this.recordRepo.save(this.seedRecord(ex.id, 'PENDING', ex.channel));
      },
    );

    registry.register(
      'a notification "<id>" in FAILED status channel "<channel>" max_attempts "<max_attempts>" exists',
      async (ex) => {
        const record = this.seedRecord(ex.id, 'PENDING', ex.channel, parseInt(ex.max_attempts));
        record.markAsSending();
        record.markAsFailed({ getValue: () => 'test failure', equals: () => false } as any);
        await this.recordRepo.save(record);
      },
    );

    registry.register(
      'a notification "<id>" in DELIVERED status channel "<channel>" exists',
      async (ex) => {
        const record = this.seedRecord(ex.id, 'PENDING', ex.channel);
        record.markAsSending();
        record.markAsDelivered();
        await this.recordRepo.save(record);
      },
    );

    // ── When ──────────────────────────────────────────────────────────────────

    registry.register(
      'I dispatch a notification with id "<id>" type "<type>" channel "<channel>"',
      async (ex) => {
        // DispatchNotification is internal-only — seed via repository using the domain factory
        await this.recordRepo.save(this.seedRecord(ex.id, 'PENDING', ex.channel, 3, ex.type));
        this.lastOperationStatus = 200;
      },
    );

    registry.register(
      'I cancel the notification "<id>"',
      async (ex) => {
        try {
          const handler = new CancelNotificationHandler(this.recordRepo);
          await handler.handle(
            CancelNotificationCommand.create(ex.id, this.customerId, this.tenantCtx()),
          );
          this.lastOperationStatus = 200;
        } catch (err) {
          this.lastOperationStatus = err instanceof DomainException ? 400 : 500;
        }
      },
    );

    registry.register(
      'I retry the notification "<id>"',
      async (ex) => {
        try {
          const handler = new RetryNotificationHandler(this.recordRepo, noopEventBus);
          await handler.handle(
            RetryNotificationCommand.create(ex.id, this.customerId, this.tenantCtx()),
          );
          this.lastOperationStatus = 200;
        } catch (err) {
          this.lastOperationStatus = err instanceof DomainException ? 400 : 500;
        }
      },
    );

    registry.register(
      'I set preference channel "<channel>" type "<type>" enabled "<enabled>" destination "<destination>"',
      async (ex) => {
        const destination = ex.destination === 'none' ? null : ex.destination;
        const handler = new UpdateNotificationPreferenceHandler(this.prefRepo, noopEventBus);
        await handler.handle(
          UpdateNotificationPreferenceCommand.create({
            userId: this.userId,
            customerId: this.customerId,
            channel: ex.channel,
            notificationType: ex.type,
            enabled: ex.enabled === 'true',
            destination,
            tenantContext: this.tenantCtx(),
          }),
        );
        this.lastOperationStatus = 200;
      },
    );

    registry.register(
      'I list my notifications',
      async () => {
        const handler = new GetNotificationHistoryHandler(this.recordRepo);
        this.lastListResult = await handler.handle(
          GetNotificationHistoryQuery.create(
            this.customerId,
            { userId: this.userId, page: 1, limit: 50 },
            this.tenantCtx(),
          ),
        );
        this.lastOperationStatus = 200;
      },
    );

    registry.register(
      'I get the notification "<id>"',
      async (ex) => {
        const handler = new GetNotificationRecordHandler(this.recordRepo);
        await handler.handle(
          GetNotificationRecordQuery.create(ex.id, this.customerId, this.tenantCtx()),
        );
        this.lastOperationStatus = 200;
      },
    );

    // ── Then ──────────────────────────────────────────────────────────────────

    registry.register(
      'the notification "<id>" has status "<expected_status>"',
      async (ex) => {
        const record = await this.recordRepo.findById(
          NotificationRecordId.create(ex.id),
          CustomerId.create(this.customerId),
        );
        expect(record, `Notification ${ex.id} not found`).not.toBeNull();
        expect(record!.status.value).toBe(ex.expected_status);
      },
    );

    registry.register(
      'the notification "<id>" has attempt_count "<expected_attempt_count>"',
      async (ex) => {
        const record = await this.recordRepo.findById(
          NotificationRecordId.create(ex.id),
          CustomerId.create(this.customerId),
        );
        expect(record, `Notification ${ex.id} not found`).not.toBeNull();
        expect(record!.attemptCount.getValue()).toBe(parseInt(ex.expected_attempt_count));
      },
    );

    registry.register(
      'the response status is "<expected_http_status>"',
      async (ex) => {
        expect(this.lastOperationStatus).toBe(parseInt(ex.expected_http_status));
      },
    );

    registry.register(
      'the notification history includes "<id>"',
      async (ex) => {
        expect(this.lastListResult, 'No list result stored').not.toBeNull();
        const records: NotificationRecordEntity[] = this.lastListResult?.records ?? [];
        const found = records.some((r) => r.getId().getValue() === ex.id);
        expect(
          found,
          `Expected ${ex.id} in history. Got: [${records.map((r) => r.getId().getValue()).join(', ')}]`,
        ).toBe(true);
      },
    );

    registry.register(
      'my preference channel "<channel>" type "<type>" has enabled "<expected_enabled>"',
      async (ex) => {
        const pref = await this.prefRepo.findOne(
          this.userId,
          NotificationChannel.fromString(ex.channel),
          NotificationType.fromString(ex.type),
          CustomerId.create(this.customerId),
        );
        expect(pref, `Preference channel=${ex.channel} type=${ex.type} not found`).not.toBeNull();
        expect(pref!.enabled).toBe(ex.expected_enabled === 'true');
      },
    );

    registry.register(
      'my preference channel "<channel>" type "<type>" has destination "<expected_destination>"',
      async (ex) => {
        const pref = await this.prefRepo.findOne(
          this.userId,
          NotificationChannel.fromString(ex.channel),
          NotificationType.fromString(ex.type),
          CustomerId.create(this.customerId),
        );
        expect(pref, `Preference channel=${ex.channel} type=${ex.type} not found`).not.toBeNull();
        if (ex.expected_destination === 'none') {
          expect(pref!.destination).toBeNull();
        } else {
          expect(pref!.destination?.getValue()).toBe(ex.expected_destination);
        }
      },
    );
  }

  private seedRecord(
    id: string,
    status: string,
    channel: string,
    maxAttempts = 3,
    type = 'ALERT_TRIGGERED',
  ): NotificationRecordEntity {
    return NotificationRecordEntity.reconstitute({
      id: NotificationRecordId.create(id),
      customerId: CustomerId.create(this.customerId),
      userId: this.userId,
      type: NotificationType.fromString(type),
      channel: NotificationChannel.fromString(channel),
      recipient: NotificationRecipient.create('test@example.com'),
      subject: NotificationSubject.create('Test notification'),
      body: NotificationBody.create('Test notification body'),
      status: NotificationDeliveryStatus.create(status),
      attemptCount: NotificationAttemptCount.zero(),
      maxAttempts: NotificationMaxAttempts.create(maxAttempts),
      sourceEventId: SourceEventId.create(FIXED_SOURCE_EVENT_ID),
      sourceEntityId: null,
      errorMessage: null,
      scheduledAt: null,
      sentAt: null,
      deliveredAt: null,
      failedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }
}
