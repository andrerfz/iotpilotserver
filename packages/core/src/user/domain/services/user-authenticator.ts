import {UserEntity} from '../entities/user.entity';
import {Email} from '../value-objects/email.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserRepository} from '../interfaces/user-repository.interface';
import {PasswordHasher} from './password-hasher';
import {Password} from '../value-objects/password.vo';

export class UserAuthenticator {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: PasswordHasher
    ) {}

    async authenticate(
        email: Email,
        password: string,
        tenantContext?: CustomerId
    ): Promise<UserEntity | null> {
        const user = await this.userRepository.findByEmail(email);
        
        if (!user) {
            throw new Error(`UserAuthenticator.authenticate: User not found for email: ${email.getValue()}`);
        }
        
        if (!user.checkIsActive()) {
            throw new Error(`USER_NOT_ACTIVE:${email.getValue()}`);
        }

        // Verify password using bcrypt — skip Password VO validation during login
        const passwordVo = Password.createHashed(password);
        const isPasswordValid = await this.passwordHasher.verify(passwordVo, user.credentials.passwordHash);

        if (!isPasswordValid) {
            throw new Error(`Invalid password for email: ${email.getValue()}`);
        }

        // For tenant-specific authentication, verify user belongs to tenant
        if (tenantContext && !user.isSuperAdmin) {
            if (!user.belongsToTenant(tenantContext)) {
                return null;
            }
        }

        // Don't update last login here - it will be done in the transaction
        // user.updateLastLogin();
        // await this.userRepository.save(user);

        return user;
    }

    async authenticateSuperAdmin(
        email: Email,
        password: string
    ): Promise<UserEntity | null> {
        console.log(`🔍 UserAuthenticator.authenticateSuperAdmin: Finding user with email: ${email.getValue()}`);
        const user = await this.userRepository.findByEmail(email);

        console.log(`🔍 UserAuthenticator.authenticateSuperAdmin: User found:`, !!user);
        if (!user) {
            console.log(`🔍 UserAuthenticator.authenticateSuperAdmin: No user found`);
            return null;
        }

        console.log(`🔍 UserAuthenticator.authenticateSuperAdmin: User isActive:`, user.checkIsActive());
        console.log(`🔍 UserAuthenticator.authenticateSuperAdmin: User isSuperAdmin:`, user.isSuperAdmin());

        if (!user.isActive || !user.isSuperAdmin()) {
            console.log(`🔍 UserAuthenticator.authenticateSuperAdmin: User not active or not superadmin`);
            return null;
        }

        if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 UserAuthenticator.authenticateSuperAdmin: Verifying password`);
        }

        // Verify password using bcrypt — skip Password VO validation during login
        const passwordVo = Password.createHashed(password);
        const isPasswordValid = await this.passwordHasher.verify(passwordVo, user.credentials.passwordHash);

        if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 UserAuthenticator.authenticateSuperAdmin: Password valid:`, isPasswordValid);
        }

        if (!isPasswordValid) {
            return null;
        }

        console.log(`🔍 UserAuthenticator.authenticateSuperAdmin: Authentication successful`);

        // Don't update last login here - it will be done in the transaction
        // user.updateLastLogin();
        // await this.userRepository.save(user);

        return user;
    }
}
