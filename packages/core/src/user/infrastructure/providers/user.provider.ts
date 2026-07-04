import {DependencyContainer} from 'tsyringe';
import {BoundedContextProvider, HandlerRegistrationContext} from '@iotpilot/core/shared/infrastructure/container/bounded-context-provider.interface';
import {UserRepository} from '@iotpilot/core/user/domain/interfaces/user-repository.interface';
import {SessionRepository} from '@iotpilot/core/user/domain/interfaces/session-repository.interface';
import {ApiKeyRepository} from '@iotpilot/core/user/domain/interfaces/api-key-repository.interface';
import {PrismaUserRepository} from '@iotpilot/core/user/infrastructure/repositories/prisma-user.repository';
import {PrismaSessionRepository} from '@iotpilot/core/user/infrastructure/repositories/prisma-session.repository';
import {PrismaApiKeyRepository} from '@iotpilot/core/user/infrastructure/repositories/prisma-api-key.repository';
import {UserMapper} from '@iotpilot/core/user/infrastructure/mappers/user.mapper';
import {ApiKeyMapper} from '@iotpilot/core/user/infrastructure/mappers/api-key.mapper';
import {UserSessionService} from '@iotpilot/core/user/infrastructure/services/user-session.service';
import {UserAuthenticator} from '@iotpilot/core/user/domain/services/user-authenticator';
import {BcryptPasswordHasher} from '@iotpilot/core/user/infrastructure/services/bcrypt-password-hasher';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

/**
 * User Bounded Context Service Provider
 * Registers all user-related dependencies
 */
export class UserServiceProvider implements BoundedContextProvider {
  getContextName(): string {
    return 'User';
  }

  register(container: DependencyContainer): void {
    // Register mappers as singletons
    container.registerSingleton<UserMapper>('UserMapper', UserMapper);
    container.registerSingleton<ApiKeyMapper>('ApiKeyMapper', ApiKeyMapper);

    // Register repositories
    container.register<UserRepository>('UserRepository', {
      useFactory: (c: DependencyContainer) => {
        const mapper = c.resolve<UserMapper>('UserMapper');
        const prisma = c.resolve<PrismaService>('PrismaService');
        return new PrismaUserRepository(mapper, prisma);
      }
    });

    container.register<SessionRepository>('SessionRepository', {
      useFactory: (c: DependencyContainer) => {
        const prisma = c.resolve<PrismaService>('PrismaService');
        return new PrismaSessionRepository(prisma);
      }
    });

    container.register<ApiKeyRepository>('ApiKeyRepository', {
      useFactory: (c: DependencyContainer) => {
        const mapper = c.resolve<ApiKeyMapper>('ApiKeyMapper');
        const prisma = c.resolve<PrismaService>('PrismaService');
        return new PrismaApiKeyRepository(mapper, prisma);
      }
    });

    // Register services
    container.register<BcryptPasswordHasher>('BcryptPasswordHasher', {
      useClass: BcryptPasswordHasher
    });

    container.register<UserAuthenticator>('UserAuthenticator', {
      useFactory: (c: DependencyContainer) => {
        const userRepo = c.resolve<UserRepository>('UserRepository');
        const passwordHasher = c.resolve<BcryptPasswordHasher>('BcryptPasswordHasher');
        return new UserAuthenticator(userRepo, passwordHasher);
      }
    });

    container.register<UserSessionService>('UserSessionService', {
      useFactory: (c: DependencyContainer) => {
        const prisma = c.resolve<PrismaService>('PrismaService');
        const sessionRepo = c.resolve<SessionRepository>('SessionRepository');
        return new UserSessionService(prisma, sessionRepo);
      }
    });
  }

  registerHandlers(ctx: HandlerRegistrationContext): void {
    const {commandBus, queryBus, eventBus, container} = ctx;

    // Lazy imports — keeps the provider file light and avoids circular deps
    const {ValidateSessionQuery} = require('@iotpilot/core/user/application/queries/validate-session/validate-session.query');
    const {ValidateSessionHandler} = require('@iotpilot/core/user/application/queries/validate-session/validate-session.handler');
    const {GetUserQuery} = require('@iotpilot/core/user/application/queries/get-user/get-user.query');
    const {GetUserHandler} = require('@iotpilot/core/user/application/queries/get-user/get-user.handler');
    const {ApproveUserCommand} = require('@iotpilot/core/user/application/commands/approve-user/approve-user.command');
    const {ApproveUserHandler} = require('@iotpilot/core/user/application/commands/approve-user/approve-user.handler');
    const {AuthenticateUserCommand} = require('@iotpilot/core/user/application/commands/authenticate-user/authenticate-user.command');
    const {AuthenticateUserHandler} = require('@iotpilot/core/user/application/commands/authenticate-user/authenticate-user.handler');
    const {RegisterUserCommand} = require('@iotpilot/core/user/application/commands/register-user/register-user.command');
    const {RegisterUserHandler} = require('@iotpilot/core/user/application/commands/register-user/register-user.handler');
    const {GetCurrentUserQuery} = require('@iotpilot/core/user/application/queries/get-current-user/get-current-user.query');
    const {GetCurrentUserHandler} = require('@iotpilot/core/user/application/queries/get-current-user/get-current-user.handler');
    const {LogoutUserCommand} = require('@iotpilot/core/user/application/commands/logout-user/logout-user.command');
    const {LogoutUserHandler} = require('@iotpilot/core/user/application/commands/logout-user/logout-user.handler');
    const {RefreshSessionCommand} = require('@iotpilot/core/user/application/commands/refresh-session/refresh-session.command');
    const {RefreshSessionHandler} = require('@iotpilot/core/user/application/commands/refresh-session/refresh-session.handler');
    const {ListApiKeysQuery} = require('@iotpilot/core/user/application/queries/list-api-keys/list-api-keys.query');
    const {ListApiKeysHandler} = require('@iotpilot/core/user/application/queries/list-api-keys/list-api-keys.handler');
    const {CreateApiKeyCommand} = require('@iotpilot/core/user/application/commands/create-api-key/create-api-key.command');
    const {CreateApiKeyHandler} = require('@iotpilot/core/user/application/commands/create-api-key/create-api-key.handler');
    const {GetUserByIdQuery} = require('@iotpilot/core/user/application/queries/get-user-by-id/get-user-by-id.query');
    const {GetUserByIdHandler} = require('@iotpilot/core/user/application/queries/get-user-by-id/get-user-by-id.handler');
    const {GetUserProfileQuery} = require('@iotpilot/core/user/application/queries/get-user-profile/get-user-profile.query');
    const {GetUserProfileHandler} = require('@iotpilot/core/user/application/queries/get-user-profile/get-user-profile.handler');
    const {UpdateUserProfileCommand} = require('@iotpilot/core/user/application/commands/update-user-profile/update-user-profile.command');
    const {UpdateUserProfileHandler} = require('@iotpilot/core/user/application/commands/update-user-profile/update-user-profile.handler');
    const {ListUsersQuery} = require('@iotpilot/core/user/application/queries/list-users/list-users.query');
    const {ListUsersHandler} = require('@iotpilot/core/user/application/queries/list-users/list-users.handler');
    const {UpdateUserCommand} = require('@iotpilot/core/user/application/commands/update-user/update-user.command');
    const {UpdateUserHandler} = require('@iotpilot/core/user/application/commands/update-user/update-user.handler');
    const {RemoveUserCommand} = require('@iotpilot/core/user/application/commands/remove-user/remove-user.command');
    const {RemoveUserHandler} = require('@iotpilot/core/user/application/commands/remove-user/remove-user.handler');
    const {TenantIsolationEnforcer} = require('@iotpilot/core/customer/domain/services/tenant-isolation-enforcer.service');
    const {StructuredLogger} = require('@iotpilot/core/shared/infrastructure/logging/structured-logger');

    const userRepo = container.resolve('UserRepository');
    const sessionRepo = container.resolve('SessionRepository');
    const apiKeyRepo = container.resolve('ApiKeyRepository');
    const authenticator = container.resolve('UserAuthenticator');
    const passwordHasher = container.resolve('BcryptPasswordHasher');
    const sessionService = container.resolve('UserSessionService');
    const cryptoService = container.resolve('CryptoService');
    const logger = StructuredLogger.forService('user-handlers');

    queryBus.register(ValidateSessionQuery, new ValidateSessionHandler(sessionRepo, userRepo));
    commandBus.register(AuthenticateUserCommand, new AuthenticateUserHandler(authenticator, sessionService, eventBus));
    commandBus.register(RegisterUserCommand, new RegisterUserHandler(userRepo, passwordHasher, logger, eventBus));
    queryBus.register(GetCurrentUserQuery, new GetCurrentUserHandler(userRepo));
    commandBus.register(LogoutUserCommand, new LogoutUserHandler(sessionRepo, eventBus));
    commandBus.register(RefreshSessionCommand, new RefreshSessionHandler(sessionRepo, userRepo, eventBus));
    queryBus.register(ListApiKeysQuery, new ListApiKeysHandler(apiKeyRepo));
    commandBus.register(CreateApiKeyCommand, new CreateApiKeyHandler(apiKeyRepo, cryptoService, eventBus));
    queryBus.register(GetUserQuery, new GetUserHandler(userRepo, logger));

    const tenantEnforcer = new TenantIsolationEnforcer();
    queryBus.register(GetUserByIdQuery, new GetUserByIdHandler(userRepo, tenantEnforcer));
    queryBus.register(GetUserProfileQuery, new GetUserProfileHandler(userRepo, tenantEnforcer));
    commandBus.register(UpdateUserProfileCommand, new UpdateUserProfileHandler(userRepo, tenantEnforcer));
    queryBus.register(ListUsersQuery, new ListUsersHandler(userRepo, logger));
    commandBus.register(UpdateUserCommand, new UpdateUserHandler(userRepo, logger, eventBus));
    commandBus.register(RemoveUserCommand, new RemoveUserHandler(userRepo, tenantEnforcer));
    commandBus.register(ApproveUserCommand, new ApproveUserHandler(userRepo, eventBus));

    // VerifyTwoFactor doesn't need email — register unconditionally
    const prisma = container.resolve('PrismaService');
    const {VerifyTwoFactorCommand} = require('@iotpilot/core/user/application/commands/verify-two-factor/verify-two-factor.command');
    const {VerifyTwoFactorHandler} = require('@iotpilot/core/user/application/commands/verify-two-factor/verify-two-factor.handler');
    commandBus.register(VerifyTwoFactorCommand, new VerifyTwoFactorHandler(prisma, sessionService));

    const {AcceptInviteCommand} = require('@iotpilot/core/user/application/commands/accept-invite/accept-invite.command');
    const {AcceptInviteHandler} = require('@iotpilot/core/user/application/commands/accept-invite/accept-invite.handler');
    commandBus.register(AcceptInviteCommand, new AcceptInviteHandler(prisma, passwordHasher));

    // Email-dependent handlers (send verification code, invite)
    let emailService = null;
    try { emailService = container.resolve('EmailService'); } catch { /* not available client-side */ }

    if (emailService) {
        const {SendVerificationCodeCommand} = require('@iotpilot/core/user/application/commands/send-verification-code/send-verification-code.command');
        const {SendVerificationCodeHandler} = require('@iotpilot/core/user/application/commands/send-verification-code/send-verification-code.handler');
        commandBus.register(SendVerificationCodeCommand, new SendVerificationCodeHandler(prisma, emailService));

        const {InviteUserCommand} = require('@iotpilot/core/user/application/commands/invite-user/invite-user.command');
        const {InviteUserHandler} = require('@iotpilot/core/user/application/commands/invite-user/invite-user.handler');
        commandBus.register(InviteUserCommand, new InviteUserHandler(prisma, emailService));
    }
  }

  boot?(container: DependencyContainer): void {
    console.log('[UserProvider] User bounded context registered');
  }
}

// Factory function
export const createUserProvider = (): BoundedContextProvider => {
  return new UserServiceProvider();
};
