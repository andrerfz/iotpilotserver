/**
 * @vitest-environment node
 * @generated from bc-notification.feature — do not edit by hand
 */
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { PrismaNotificationRecordRepository } from '@iotpilot/core/notification/infrastructure/repositories/prisma-notification-record.repository';
import { PrismaNotificationPreferenceRepository } from '@iotpilot/core/notification/infrastructure/repositories/prisma-notification-preference.repository';
import { StepRegistry } from '../runtime/StepRegistry';
import { runScenarios } from '../runtime/AcceptanceRuntime';
import { NotificationSteps } from '../steps/NotificationSteps';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const TEST_CUSTOMER_SLUG = 'acceptance-notification-test';
const TEST_AUTH_TOKEN = 'acceptance-notif-token-00000000001';

const prismaService = new PrismaService();
const recordRepo = new PrismaNotificationRecordRepository(prismaService);
const prefRepo = new PrismaNotificationPreferenceRepository(prismaService);
const registry = new StepRegistry();

let customerId: string;
let userId: string;

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const client = prismaService.getClient();

  // Idempotent teardown of any previous run's fixtures
  await client.session.deleteMany({ where: { token: TEST_AUTH_TOKEN } });
  const existing = await client.customer.findFirst({ where: { slug: TEST_CUSTOMER_SLUG } });
  if (existing) {
    await client.notificationRecord.deleteMany({ where: { customerId: existing.id } });
    await client.notificationPreference.deleteMany({ where: { customerId: existing.id } });
    await client.user.deleteMany({ where: { customerId: existing.id } });
    await client.customer.delete({ where: { id: existing.id } });
  }

  const customer = await client.customer.create({
    data: { name: 'Acceptance Test — Notifications', slug: TEST_CUSTOMER_SLUG, status: 'ACTIVE' },
  });
  customerId = customer.id;

  const user = await client.user.create({
    data: {
      email: 'acceptance-notif@test.internal',
      username: 'acceptance-notif',
      password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      role: 'ADMIN',
      status: 'ACTIVE',
      customerId,
    },
  });
  userId = user.id;

  await client.session.create({
    data: {
      userId,
      customerId,
      token: TEST_AUTH_TOKEN,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // Register step handlers now that customerId/userId are known
  new NotificationSteps(recordRepo, prefRepo, customerId, userId).register(registry);
});

afterAll(async () => {
  const client = prismaService.getClient();
  await client.session.deleteMany({ where: { token: TEST_AUTH_TOKEN } });
  await client.notificationPreference.deleteMany({ where: { customerId } });
  await client.notificationRecord.deleteMany({ where: { customerId } });
  await client.user.deleteMany({ where: { customerId } });
  await client.customer.delete({ where: { id: customerId } });
  await prismaService.close();
});

beforeEach(async () => {
  const client = prismaService.getClient();
  await client.notificationRecord.deleteMany({ where: { customerId } });
  await client.notificationPreference.deleteMany({ where: { customerId } });
});

// ── Scenarios ─────────────────────────────────────────────────────────────────

runScenarios('Notification Management', [
  {
    name: 'Dispatch a notification — record starts in PENDING status',
    steps: [
      'I dispatch a notification with id "<id>" type "<type>" channel "<channel>"',
      'the notification "<id>" has status "<expected_status>"',
      'the notification "<id>" has attempt_count "<expected_attempt_count>"',
    ],
    examples: [
      { id: 'aaa00000-0000-0000-0000-000000000001', type: 'ALERT_TRIGGERED', channel: 'EMAIL', expected_status: 'PENDING', expected_attempt_count: '0' },
    ],
  },
  {
    name: 'Cancel a PENDING notification',
    steps: [
      'a notification "<id>" in PENDING status channel "<channel>" exists',
      'I cancel the notification "<id>"',
      'the notification "<id>" has status "<expected_status>"',
    ],
    examples: [
      { id: 'aaa00000-0000-0000-0000-000000000002', channel: 'EMAIL', expected_status: 'CANCELLED' },
    ],
  },
  {
    name: 'Retry a FAILED notification — status resets to PENDING',
    steps: [
      'a notification "<id>" in FAILED status channel "<channel>" max_attempts "<max_attempts>" exists',
      'I retry the notification "<id>"',
      'the notification "<id>" has status "<expected_status>"',
    ],
    examples: [
      { id: 'aaa00000-0000-0000-0000-000000000003', channel: 'EMAIL', max_attempts: '3', expected_status: 'PENDING' },
    ],
  },
  {
    name: 'Cannot cancel a non-PENDING notification',
    steps: [
      'a notification "<id>" in DELIVERED status channel "<channel>" exists',
      'I cancel the notification "<id>"',
      'the response status is "<expected_http_status>"',
    ],
    examples: [
      { id: 'aaa00000-0000-0000-0000-000000000004', channel: 'EMAIL', expected_http_status: '400' },
    ],
  },
  {
    name: 'Cannot retry a DELIVERED notification',
    steps: [
      'a notification "<id>" in DELIVERED status channel "<channel>" exists',
      'I retry the notification "<id>"',
      'the response status is "<expected_http_status>"',
    ],
    examples: [
      { id: 'aaa00000-0000-0000-0000-000000000005', channel: 'EMAIL', expected_http_status: '400' },
    ],
  },
  {
    name: 'Update a notification preference — stored with correct values',
    steps: [
      'I set preference channel "<channel>" type "<type>" enabled "<enabled>" destination "<destination>"',
      'my preference channel "<channel>" type "<type>" has enabled "<expected_enabled>"',
      'my preference channel "<channel>" type "<type>" has destination "<expected_destination>"',
    ],
    examples: [
      { channel: 'EMAIL', type: 'ALERT_TRIGGERED', enabled: 'true', destination: 'user@example.com', expected_enabled: 'true', expected_destination: 'user@example.com' },
      { channel: 'SLACK', type: 'DEVICE_OFFLINE', enabled: 'false', destination: 'none', expected_enabled: 'false', expected_destination: 'none' },
    ],
  },
  {
    name: 'Get notification history returns created records',
    steps: [
      'a notification "<id>" in PENDING status channel "<channel>" exists',
      'I list my notifications',
      'the notification history includes "<id>"',
    ],
    examples: [
      { id: 'aaa00000-0000-0000-0000-000000000006', channel: 'EMAIL' },
    ],
  },
  {
    name: 'Get a single notification record by id',
    steps: [
      'a notification "<id>" in PENDING status channel "<channel>" exists',
      'I get the notification "<id>"',
      'the notification "<id>" has status "<expected_status>"',
    ],
    examples: [
      { id: 'aaa00000-0000-0000-0000-000000000007', channel: 'EMAIL', expected_status: 'PENDING' },
    ],
  },
], registry);
