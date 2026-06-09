/**
 * @vitest-environment node
 * Acceptance tests for bc-user — User Management bounded context.
 *
 * Covers: registration, authentication, session timeout preference,
 * user preferences (save/load), and logout.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { PrismaUserRepository } from '@iotpilot/core/user/infrastructure/repositories/prisma-user.repository';
import { PrismaSessionRepository } from '@iotpilot/core/user/infrastructure/repositories/prisma-session.repository';
import { UserMapper } from '@iotpilot/core/user/infrastructure/mappers/user.mapper';
import { Email } from '@iotpilot/core/user/domain/value-objects/email.vo';
import { UserId } from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { RegisterUserCommand } from '@iotpilot/core/user/application/commands/register-user/register-user.command';
import { RegisterUserHandler } from '@iotpilot/core/user/application/commands/register-user/register-user.handler';
import { AuthenticateUserCommand } from '@iotpilot/core/user/application/commands/authenticate-user/authenticate-user.command';
import { AuthenticateUserHandler } from '@iotpilot/core/user/application/commands/authenticate-user/authenticate-user.handler';
import { LogoutUserCommand } from '@iotpilot/core/user/application/commands/logout-user/logout-user.command';
import { LogoutUserHandler } from '@iotpilot/core/user/application/commands/logout-user/logout-user.handler';
import { BcryptPasswordHasher } from '@iotpilot/core/user/infrastructure/services/bcrypt-password-hasher';
import { UserAuthenticator } from '@iotpilot/core/user/domain/services/user-authenticator';
import { StructuredLogger } from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import { UserSessionService } from '@iotpilot/core/user/infrastructure/services/user-session.service';
import type { EventBus } from '@iotpilot/core/shared/application/bus/event.bus';

const noopEventBus: EventBus = { publish: async () => {}, subscribe: () => {} };

const TEST_CUSTOMER_SLUG = 'bc-user-acceptance-test';

const prismaService = new PrismaService();
const hasher = new BcryptPasswordHasher();
const logger = StructuredLogger.forService('bc-user-acceptance');

let customerId: string;
let userRepo: ReturnType<typeof createRepos>['userRepo'];
let sessionRepo: ReturnType<typeof createRepos>['sessionRepo'];

function createRepos() {
  return {
    userRepo: new PrismaUserRepository(new UserMapper(), prismaService),
    sessionRepo: new PrismaSessionRepository(prismaService),
  };
}

function tenantCtx(cid: string) {
  return TenantContextImpl.create(CustomerId.create(cid));
}

function sessionService(sRepo: typeof sessionRepo) {
  return new UserSessionService(prismaService, sRepo);
}

async function registerUser(email: string, username: string, password: string, cid: string) {
  const repos = createRepos();
  const handler = new RegisterUserHandler(repos.userRepo, hasher, logger, noopEventBus);
  return handler.handle(new RegisterUserCommand(tenantCtx(cid), email, password, username, ''));
}

async function authenticateUser(email: string, password: string, cid: string) {
  const repos = createRepos();
  const handler = new AuthenticateUserHandler(
    new UserAuthenticator(repos.userRepo, hasher),
    sessionService(repos.sessionRepo),
    noopEventBus,
  );
  return handler.handle(AuthenticateUserCommand.createForTenant(email, password, cid));
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const client = prismaService.getClient();
  const existing = await client.customer.findFirst({ where: { slug: TEST_CUSTOMER_SLUG } });
  if (existing) {
    await client.userPreference.deleteMany({ where: { user: { customerId: existing.id } } });
    await client.session.deleteMany({ where: { customerId: existing.id } });
    await client.user.deleteMany({ where: { customerId: existing.id } });
    await client.customer.delete({ where: { id: existing.id } });
  }
  const customer = await client.customer.create({
    data: { name: 'BC User Acceptance', slug: TEST_CUSTOMER_SLUG, domain: `${TEST_CUSTOMER_SLUG}.test`, status: 'ACTIVE' },
  });
  customerId = customer.id;
  const repos = createRepos();
  userRepo = repos.userRepo;
  sessionRepo = repos.sessionRepo;
});

afterAll(async () => {
  const client = prismaService.getClient();
  await client.userPreference.deleteMany({ where: { user: { customerId } } });
  await client.session.deleteMany({ where: { customerId } });
  await client.user.deleteMany({ where: { customerId } });
  await client.customer.delete({ where: { id: customerId } }).catch(() => {});
  await client.$disconnect();
});

beforeEach(async () => {
  const client = prismaService.getClient();
  await client.userPreference.deleteMany({ where: { user: { customerId } } });
  await client.session.deleteMany({ where: { customerId } });
  await client.user.deleteMany({ where: { customerId } });
});

// ── Registration ──────────────────────────────────────────────────────────────

describe('Register a new user', () => {
  it.each([
    { email: 'alice@acceptance-bc.test', username: 'alice', password: 'SecurePass123!', expected_role: 'USER', expected_status: 'ACTIVE' },
    { email: 'bob@acceptance-bc.test',   username: 'bob',   password: 'SecurePass123!', expected_role: 'USER', expected_status: 'ACTIVE' },
  ])('email=$email expected_role=$expected_role expected_status=$expected_status', async (ex) => {
    const user = await registerUser(ex.email, ex.username, ex.password, customerId);

    // Assert via repository (domain layer)
    const found = await userRepo.findByEmail(Email.create(ex.email));
    expect(found, `User ${ex.email} not found after registration`).not.toBeNull();
    expect(found!.getRole().getValue()).toBe(ex.expected_role);
    const status = found!.isActive ? 'ACTIVE' : 'INACTIVE';
    expect(status).toBe(ex.expected_status);
  });
});

// ── Authentication ────────────────────────────────────────────────────────────

describe('Authenticate an existing user', () => {
  it.each([
    { email: 'carol@acceptance-bc.test', username: 'carol', password: 'SecurePass123!', max_expiry_minutes: 490 },
  ])('email=$email creates a session within $max_expiry_minutes minutes', async (ex) => {
    await registerUser(ex.email, ex.username, ex.password, customerId);

    const result = await authenticateUser(ex.email, ex.password, customerId);
    expect(result.token).toBeTruthy();

    // Assert session via repository
    const user = await userRepo.findByEmail(Email.create(ex.email));
    const sessions = await sessionRepo.findByUserIdInTenant(user!.getId(), CustomerId.create(customerId));
    const active = sessions.filter(s => !s.isExpired());
    expect(active.length, 'No active session created').toBeGreaterThan(0);

    const maxMs = ex.max_expiry_minutes * 60 * 1000;
    expect(active[0].getExpiresAt().getTime() - Date.now()).toBeLessThanOrEqual(maxMs);
  });
});

// ── Session timeout preference ────────────────────────────────────────────────

describe('Session timeout respects user preference', () => {
  it.each([
    { email: 'dave@acceptance-bc.test', username: 'dave', password: 'SecurePass123!', timeout_minutes: '60',  max_expiry_minutes: 62  },
    { email: 'eve@acceptance-bc.test',  username: 'eve',  password: 'SecurePass123!', timeout_minutes: '120', max_expiry_minutes: 122 },
  ])('email=$email timeout=$timeout_minutes min', async (ex) => {
    await registerUser(ex.email, ex.username, ex.password, customerId);

    // Seed the session timeout preference
    const user = await userRepo.findByEmail(Email.create(ex.email));
    await prismaService.getClient().userPreference.upsert({
      where: { userId_category_key: { userId: user!.getId().getValue(), category: 'SECURITY', key: 'sessionTimeout' } },
      update: { value: ex.timeout_minutes },
      create: { userId: user!.getId().getValue(), category: 'SECURITY', key: 'sessionTimeout', value: ex.timeout_minutes },
    });

    await authenticateUser(ex.email, ex.password, customerId);

    // Assert session expiry reflects the preference
    const sessions = await sessionRepo.findByUserIdInTenant(user!.getId(), CustomerId.create(customerId));
    const active = sessions.filter(s => !s.isExpired());
    expect(active.length, 'No active session created').toBeGreaterThan(0);

    const maxMs = ex.max_expiry_minutes * 60 * 1000;
    const timeLeft = active[0].getExpiresAt().getTime() - Date.now();
    expect(timeLeft, 'Session already expired').toBeGreaterThan(0);
    expect(timeLeft, `Session expiry ${timeLeft / 60000}min exceeds ${ex.max_expiry_minutes}min`).toBeLessThanOrEqual(maxMs);
  });
});

// ── Preferences save/load ─────────────────────────────────────────────────────

describe('Save and retrieve a user preference', () => {
  it.each([
    { email: 'frank@acceptance-bc.test', username: 'frank', password: 'SecurePass123!', category: 'SYSTEM',        key: 'theme',              value: 'dark',  expected: 'dark'  },
    { email: 'grace@acceptance-bc.test', username: 'grace', password: 'SecurePass123!', category: 'SYSTEM',        key: 'itemsPerPage',       value: '25',    expected: '25'    },
    { email: 'henry@acceptance-bc.test', username: 'henry', password: 'SecurePass123!', category: 'NOTIFICATIONS', key: 'alertNotifications', value: 'false', expected: 'false' },
    { email: 'iris@acceptance-bc.test',  username: 'iris',  password: 'SecurePass123!', category: 'SECURITY',      key: 'sessionTimeout',     value: '60',    expected: '60'    },
  ])('email=$email category=$category key=$key', async (ex) => {
    await registerUser(ex.email, ex.username, ex.password, customerId);
    const user = await userRepo.findByEmail(Email.create(ex.email));
    const userId = user!.getId().getValue();

    // Save preference via Prisma (the settings router does the same)
    await prismaService.getClient().userPreference.upsert({
      where: { userId_category_key: { userId, category: ex.category as any, key: ex.key } },
      update: { value: ex.value },
      create: { userId, category: ex.category as any, key: ex.key, value: ex.value },
    });

    // Assert preference persisted
    const pref = await prismaService.getClient().userPreference.findUnique({
      where: { userId_category_key: { userId, category: ex.category as any, key: ex.key } },
      select: { value: true },
    });
    expect(pref, `Preference ${ex.category}.${ex.key} not found`).not.toBeNull();
    expect(String(pref!.value)).toBe(ex.expected);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

describe('Logout revokes the active session', () => {
  it.each([
    { email: 'jane@acceptance-bc.test', username: 'jane', password: 'SecurePass123!' },
  ])('email=$email', async (ex) => {
    await registerUser(ex.email, ex.username, ex.password, customerId);
    const authResult = await authenticateUser(ex.email, ex.password, customerId);

    const user = await userRepo.findByEmail(Email.create(ex.email));
    const handler = new LogoutUserHandler(sessionRepo, noopEventBus);
    await handler.handle(
      LogoutUserCommand.create(user!.getId().getValue(), authResult.token, customerId, tenantCtx(customerId)),
    );

    // Assert session is revoked
    const sessions = await sessionRepo.findByUserIdInTenant(user!.getId(), CustomerId.create(customerId));
    const active = sessions.filter(s => !s.isExpired());
    expect(active.length, `Expected no active sessions for ${ex.email}`).toBe(0);
  });
});
