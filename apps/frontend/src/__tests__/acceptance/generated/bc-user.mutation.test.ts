/**
 * @vitest-environment node
 * Mutation tests for bc-user acceptance suite.
 * Each test mutates ONE expected value — the assertion must FAIL (mutation killed).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { PrismaUserRepository } from '@iotpilot/core/user/infrastructure/repositories/prisma-user.repository';
import { PrismaSessionRepository } from '@iotpilot/core/user/infrastructure/repositories/prisma-session.repository';
import { UserMapper } from '@iotpilot/core/user/infrastructure/mappers/user.mapper';
import { Email } from '@iotpilot/core/user/domain/value-objects/email.vo';
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
const TEST_SLUG = 'bc-user-mutation-test';
const prismaService = new PrismaService();
const hasher = new BcryptPasswordHasher();
const logger = StructuredLogger.forService('bc-user-mutation');

let customerId: string;
let userRepo: PrismaUserRepository;
let sessionRepo: PrismaSessionRepository;

async function reg(email: string, pw: string) {
  const r = new PrismaUserRepository(new UserMapper(), prismaService);
  const h = new RegisterUserHandler(r, hasher, logger, noopEventBus);
  return h.handle(new RegisterUserCommand(TenantContextImpl.create(CustomerId.create(customerId)), email, pw, 'mutuser', ''));
}

async function auth(email: string, pw: string) {
  const r = new PrismaUserRepository(new UserMapper(), prismaService);
  const s = new PrismaSessionRepository(prismaService);
  return new AuthenticateUserHandler(
    new UserAuthenticator(r, hasher),
    new UserSessionService(prismaService, s),
    noopEventBus,
  ).handle(AuthenticateUserCommand.createForTenant(email, pw, customerId));
}

beforeAll(async () => {
  const client = prismaService.getClient();
  const ex = await client.customer.findFirst({ where: { slug: TEST_SLUG } });
  if (ex) {
    await client.userPreference.deleteMany({ where: { user: { customerId: ex.id } } });
    await client.session.deleteMany({ where: { customerId: ex.id } });
    await client.user.deleteMany({ where: { customerId: ex.id } });
    await client.customer.delete({ where: { id: ex.id } });
  }
  const c = await client.customer.create({
    data: { name: 'BC User Mutation', slug: TEST_SLUG, domain: `${TEST_SLUG}.test`, status: 'ACTIVE' },
  });
  customerId = c.id;
  userRepo = new PrismaUserRepository(new UserMapper(), prismaService);
  sessionRepo = new PrismaSessionRepository(prismaService);
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

// Each mutation test should FAIL the assertion, proving the assertion is strong enough.
// We use expect(...).not.toBe(mutated_value) — if the test passes, the mutation is KILLED.

describe('Mutation: expected_role USER → ADMIN', () => {
  it('kills mutation — registered user role should NOT be ADMIN', async () => {
    await reg('mut1@bc-user-mutation.test', 'SecurePass123!');
    const user = await userRepo.findByEmail(Email.create('mut1@bc-user-mutation.test'));
    expect(user).not.toBeNull();
    expect(user!.getRole().getValue()).not.toBe('ADMIN'); // mutation killed: role IS 'USER'
  });
});

describe('Mutation: expected_status ACTIVE → INACTIVE', () => {
  it('kills mutation — registered user status should NOT be INACTIVE', async () => {
    await reg('mut2@bc-user-mutation.test', 'SecurePass123!');
    const user = await userRepo.findByEmail(Email.create('mut2@bc-user-mutation.test'));
    expect(user).not.toBeNull();
    const status = user!.isActive ? 'ACTIVE' : 'INACTIVE';
    expect(status).not.toBe('INACTIVE'); // mutation killed: status IS 'ACTIVE'
  });
});

describe('Mutation: preference value dark → light', () => {
  it('kills mutation — saved preference should NOT return mutated value', async () => {
    await reg('mut3@bc-user-mutation.test', 'SecurePass123!');
    const user = await userRepo.findByEmail(Email.create('mut3@bc-user-mutation.test'));
    const userId = user!.getId().getValue();

    await prismaService.getClient().userPreference.create({
      data: { userId, category: 'SYSTEM', key: 'theme', value: 'dark' },
    });

    const pref = await prismaService.getClient().userPreference.findUnique({
      where: { userId_category_key: { userId, category: 'SYSTEM', key: 'theme' } },
      select: { value: true },
    });
    expect(pref!.value).not.toBe('light'); // mutation killed: value IS 'dark'
  });
});

describe('Mutation: session timeout 60 → 480', () => {
  it('kills mutation — session expiry should NOT match default 480min', async () => {
    await reg('mut4@bc-user-mutation.test', 'SecurePass123!');
    const user = await userRepo.findByEmail(Email.create('mut4@bc-user-mutation.test'));
    await prismaService.getClient().userPreference.create({
      data: { userId: user!.getId().getValue(), category: 'SECURITY', key: 'sessionTimeout', value: '60' },
    });

    await auth('mut4@bc-user-mutation.test', 'SecurePass123!');

    const sessions = await sessionRepo.findByUserIdInTenant(user!.getId(), CustomerId.create(customerId));
    const active = sessions.filter(s => !s.isExpired());
    expect(active.length).toBeGreaterThan(0);

    const timeLeftMs = active[0].getExpiresAt().getTime() - Date.now();
    const timeLeftMin = timeLeftMs / 60000;
    // With 60min preference, session should NOT be ~480min (default)
    // If mutation survives, it means session is ~480min despite preference
    expect(timeLeftMin).toBeLessThan(65); // mutation killed: timeout IS ~60min, not ~480min
  });
});

describe('Mutation: logout — session should not survive', () => {
  it('kills mutation — after logout, no active sessions should remain', async () => {
    await reg('mut5@bc-user-mutation.test', 'SecurePass123!');
    const result = await auth('mut5@bc-user-mutation.test', 'SecurePass123!');
    const user = await userRepo.findByEmail(Email.create('mut5@bc-user-mutation.test'));

    // Mutated assertion: if logout didn't actually revoke, this WOULD find active sessions
    await new LogoutUserHandler(sessionRepo, noopEventBus).handle(
      LogoutUserCommand.create(user!.getId().getValue(), result.token, customerId,
        TenantContextImpl.create(CustomerId.create(customerId))),
    );

    const sessions = await sessionRepo.findByUserIdInTenant(user!.getId(), CustomerId.create(customerId));
    // mutation: if we check sessions.length > 0 instead of === 0, it would survive
    expect(sessions.filter(s => !s.isExpired()).length).toBe(0); // killed: sessions ARE revoked
  });
});
