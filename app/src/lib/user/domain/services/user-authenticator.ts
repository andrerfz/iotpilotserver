import {User} from '../entities/user.entity';
import {Email} from '../value-objects/email.vo';
import {Password} from '../value-objects/password.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserRepository} from '../interfaces/user-repository.interface';
import {PasswordHasher} from './password-hasher';

export class UserAuthenticator {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: PasswordHasher
    ) {}

    async authenticate(
        email: Email,
        password: Password,
        tenantContext?: CustomerId
    ): Promise<User | null> {
        const user = await this.userRepository.findByEmail(email);

        if (!user || !user.isActive()) {
            return null;
        }

        const isPasswordValid = await this.passwordHasher.verify(
            password,
            user.getPassword().getValue()
        );

        if (!isPasswordValid) {
            return null;
        }

        // For tenant-specific authentication, verify user belongs to tenant
        if (tenantContext && !user.isSuperAdmin()) {
            if (!user.belongsToTenant(tenantContext)) {
                return null;
            }
        }

        user.updateLastLogin();
        await this.userRepository.save(user);

        return user;
    }

    async authenticateSuperAdmin(
        email: Email,
        password: Password
    ): Promise<User | null> {
        const user = await this.userRepository.findByEmail(email);

        if (!user || !user.isActive() || !user.isSuperAdmin()) {
            return null;
        }

        const isPasswordValid = await this.passwordHasher.verify(
            password,
            user.getPassword().getValue()
        );

        if (!isPasswordValid) {
            return null;
        }

        user.updateLastLogin();
        await this.userRepository.save(user);

        return user;
    }
}
