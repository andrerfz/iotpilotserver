import {DependencyContainer} from 'tsyringe';
import {BoundedContextProvider} from '@/lib/shared/infrastructure/container/bounded-context-provider.interface';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {SessionRepository} from '@/lib/user/domain/interfaces/session-repository.interface';
import {ApiKeyRepository} from '@/lib/user/domain/interfaces/api-key-repository.interface';
import {PrismaUserRepository} from '@/lib/user/infrastructure/repositories/prisma-user.repository';
import {PrismaSessionRepository} from '@/lib/user/infrastructure/repositories/prisma-session.repository';
import {PrismaApiKeyRepository} from '@/lib/user/infrastructure/repositories/prisma-api-key.repository';
import {UserMapper} from '@/lib/user/infrastructure/mappers/user.mapper';
import {ApiKeyMapper} from '@/lib/user/infrastructure/mappers/api-key.mapper';
import {UserSessionService} from '@/lib/user/infrastructure/services/user-session.service';
import {UserAuthenticator} from '@/lib/user/domain/services/user-authenticator';
import {BcryptPasswordHasher} from '@/lib/user/infrastructure/services/bcrypt-password-hasher';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';

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

  boot?(container: DependencyContainer): void {
    console.log('[UserProvider] User bounded context registered');
  }
}

// Factory function
export const createUserProvider = (): BoundedContextProvider => {
  return new UserServiceProvider();
};
