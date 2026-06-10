import { expect } from 'vitest';
import { StepRegistry } from '../runtime/StepRegistry';
import { UserRepository } from '@iotpilot/core/user/domain/interfaces/user-repository.interface';
import { SessionRepository } from '@iotpilot/core/user/domain/interfaces/session-repository.interface';
import { Email } from '@iotpilot/core/user/domain/value-objects/email.vo';
import { UserId } from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { RegisterUserHandler } from '@iotpilot/core/user/application/commands/register-user/register-user.handler';
import { RegisterUserCommand } from '@iotpilot/core/user/application/commands/register-user/register-user.command';
import { AuthenticateUserHandler } from '@iotpilot/core/user/application/commands/authenticate-user/authenticate-user.handler';
import { AuthenticateUserCommand } from '@iotpilot/core/user/application/commands/authenticate-user/authenticate-user.command';
import { LogoutUserHandler } from '@iotpilot/core/user/application/commands/logout-user/logout-user.handler';
import { LogoutUserCommand } from '@iotpilot/core/user/application/commands/logout-user/logout-user.command';
import { BcryptPasswordHasher } from '@iotpilot/core/user/infrastructure/services/bcrypt-password-hasher';
import { UserAuthenticator } from '@iotpilot/core/user/domain/services/user-authenticator';
import { StructuredLogger } from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import { UserSessionService } from '@iotpilot/core/user/infrastructure/services/user-session.service';
import type { EventBus } from '@iotpilot/core/shared/application/bus/event.bus';

const noopEventBus: EventBus = { publish: async () => {}, subscribe: () => {} };

export class UserSteps {
  private lastAuthToken: string | null = null;
  private lastAuthUserId: string | null = null;

  private readonly hasher = new BcryptPasswordHasher();
  private readonly logger = StructuredLogger.forService('acceptance-user-steps');

  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly prisma: PrismaService,
    private readonly customerId: string,
  ) {}

  private tenantCtx() {
    return TenantContextImpl.create(CustomerId.create(this.customerId));
  }

  private sessionService() {
    return new UserSessionService(this.prisma, this.sessionRepo);
  }

  register(registry: StepRegistry): void {

    // ── Given ──────────────────────────────────────────────────────────────────

    registry.register(
      'a user "<email>" with username "<username>" password "<password>" exists',
      async (ex) => {
        const existing = await this.userRepo.findByEmail(Email.create(ex.email));
        if (existing) return;
        const handler = new RegisterUserHandler(this.userRepo, this.hasher, this.logger, noopEventBus);
        await handler.handle(new RegisterUserCommand(this.tenantCtx(), ex.email, ex.password, ex.username, ''));
      },
    );

    registry.register(
      'the user "<email>" has an active session',
      async (ex) => {
        const user = await this.userRepo.findByEmail(Email.create(ex.email));
        expect(user, `User ${ex.email} not found`).not.toBeNull();
        const token = await this.sessionService().createSession(user!.getId().getValue(), this.customerId);
        this.lastAuthToken = token;
        this.lastAuthUserId = user!.getId().getValue();
      },
    );

    registry.register(
      'the user "<email>" has preference category "<pref_category>" key "<pref_key>" value "<pref_value>"',
      async (ex) => {
        const user = await this.userRepo.findByEmail(Email.create(ex.email));
        expect(user, `User ${ex.email} not found`).not.toBeNull();
        const userId = user!.getId().getValue();
        await this.prisma.getClient().userPreference.upsert({
          where: { userId_category_key: { userId, category: ex.pref_category as any, key: ex.pref_key } },
          update: { value: ex.pref_value },
          create: { userId, category: ex.pref_category as any, key: ex.pref_key, value: ex.pref_value },
        });
      },
    );

    // ── When ──────────────────────────────────────────────────────────────────

    registry.register(
      'I register user "<email>" with username "<username>" password "<password>"',
      async (ex) => {
        const handler = new RegisterUserHandler(this.userRepo, this.hasher, this.logger, noopEventBus);
        const user = await handler.handle(
          new RegisterUserCommand(this.tenantCtx(), ex.email, ex.password, ex.username, ''),
        );
        this.lastAuthUserId = user.getId().getValue();
      },
    );

    registry.register(
      'I authenticate as "<email>" with password "<password>"',
      async (ex) => {
        const handler = new AuthenticateUserHandler(
          new UserAuthenticator(this.userRepo, this.hasher),
          this.sessionService(),
          noopEventBus,
        );
        const result = await handler.handle(
          AuthenticateUserCommand.createForTenant(ex.email, ex.password, this.customerId),
        );
        this.lastAuthToken = result.token;
        this.lastAuthUserId = result.user.id;
      },
    );

    registry.register(
      'I save preference category "<pref_category>" key "<pref_key>" value "<pref_value>" for user "<email>"',
      async (ex) => {
        const user = await this.userRepo.findByEmail(Email.create(ex.email));
        expect(user, `User ${ex.email} not found`).not.toBeNull();
        const userId = user!.getId().getValue();
        await this.prisma.getClient().userPreference.upsert({
          where: { userId_category_key: { userId, category: ex.pref_category as any, key: ex.pref_key } },
          update: { value: ex.pref_value },
          create: { userId, category: ex.pref_category as any, key: ex.pref_key, value: ex.pref_value },
        });
      },
    );

    registry.register(
      'I log out user "<email>"',
      async (ex) => {
        const user = await this.userRepo.findByEmail(Email.create(ex.email));
        expect(user, `User ${ex.email} not found`).not.toBeNull();
        const handler = new LogoutUserHandler(this.sessionRepo, noopEventBus);
        await handler.handle(
          LogoutUserCommand.create(
            user!.getId().getValue(),
            this.lastAuthToken ?? undefined,
            this.customerId,
            this.tenantCtx(),
          ),
        );
      },
    );

    // ── Then ──────────────────────────────────────────────────────────────────

    registry.register(
      'the user "<email>" has role "<expected_role>"',
      async (ex) => {
        const user = await this.userRepo.findByEmail(Email.create(ex.email));
        expect(user, `User ${ex.email} not found`).not.toBeNull();
        expect(user!.getRole().getValue()).toBe(ex.expected_role);
      },
    );

    registry.register(
      'the user "<email>" has status "<expected_status>"',
      async (ex) => {
        const user = await this.userRepo.findByEmail(Email.create(ex.email));
        expect(user, `User ${ex.email} not found`).not.toBeNull();
        const status = user!.isActive ? 'ACTIVE' : 'INACTIVE';
        expect(status).toBe(ex.expected_status);
      },
    );

    registry.register(
      'a session exists for user "<email>"',
      async (ex) => {
        const user = await this.userRepo.findByEmail(Email.create(ex.email));
        expect(user, `User ${ex.email} not found`).not.toBeNull();
        const sessions = await this.sessionRepo.findByUserIdInTenant(
          user!.getId(),
          CustomerId.create(this.customerId),
        );
        const active = sessions.filter(s => !s.isExpired());
        expect(active.length, `No active session for ${ex.email}`).toBeGreaterThan(0);
      },
    );

    registry.register(
      'the session expires within "<max_expiry_minutes>" minutes',
      async (ex) => {
        expect(this.lastAuthUserId, 'No authenticated user stored').not.toBeNull();
        const sessions = await this.sessionRepo.findByUserIdInTenant(
          UserId.create(this.lastAuthUserId!),
          CustomerId.create(this.customerId),
        );
        const active = sessions.filter(s => !s.isExpired());
        expect(active.length, 'No active session found').toBeGreaterThan(0);

        const maxMs = parseInt(ex.max_expiry_minutes) * 60 * 1000;
        const now = Date.now();
        const expiresAt = active[0].getExpiresAt().getTime();
        expect(expiresAt - now, 'Session already expired').toBeGreaterThan(0);
        expect(expiresAt - now, `Session expiry exceeds ${ex.max_expiry_minutes} min`).toBeLessThanOrEqual(maxMs);
      },
    );

    registry.register(
      'the user "<email>" preference category "<pref_category>" key "<pref_key>" equals "<expected_value>"',
      async (ex) => {
        const user = await this.userRepo.findByEmail(Email.create(ex.email));
        expect(user, `User ${ex.email} not found`).not.toBeNull();
        const userId = user!.getId().getValue();
        const pref = await this.prisma.getClient().userPreference.findUnique({
          where: { userId_category_key: { userId, category: ex.pref_category as any, key: ex.pref_key } },
          select: { value: true },
        });
        expect(pref, `Preference ${ex.pref_category}.${ex.pref_key} not found for ${ex.email}`).not.toBeNull();
        expect(String(pref!.value)).toBe(String(ex.expected_value));
      },
    );

    registry.register(
      'no active session exists for user "<email>"',
      async (ex) => {
        const user = await this.userRepo.findByEmail(Email.create(ex.email));
        expect(user, `User ${ex.email} not found`).not.toBeNull();
        const sessions = await this.sessionRepo.findByUserIdInTenant(
          user!.getId(),
          CustomerId.create(this.customerId),
        );
        const active = sessions.filter(s => !s.isExpired());
        expect(active.length, `Expected no active sessions for ${ex.email}`).toBe(0);
      },
    );
  }
}
