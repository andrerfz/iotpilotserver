import {UserId} from '../domain/value-objects/user-id.vo';
import {Email} from '../domain/value-objects/email.vo';
import {UserRole} from '../../shared/domain/value-objects/user-role.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserEntity} from '../domain/entities/user.entity';

/**
 * Factory for creating user entities and related objects for testing
 */
export class UserTestFactory {
    /**
     * Create a user entity with default values
     * @param customerId Optional customer ID (generated if not provided)
     * @param email Optional email (default: 'test@example.com')
     * @param username Optional username (default: 'testuser')
     * @param role Optional role (default: USER)
     * @param status Optional status (default: ACTIVE)
     * @returns A user entity
     */
    static createUser(
        customerId?: CustomerId,
        email: string = 'test@example.com',
        role: string = 'USER',
        status: string = 'ACTIVE'
    ): UserEntity {
        const userId = UserId.create(crypto.randomUUID());
        const userEmail = Email.create(email);
        const userRole = UserRole.fromString(role);

        // Create basic credentials
        const credentials = {
            passwordHash: 'hashed_TestPassword123!',
            salt: 'test_salt',
            failedLoginAttempts: 0,
            isLocked: false
        };

        const user = new UserEntity(userId, userEmail, userRole, customerId, credentials);

        // Set the correct status if not ACTIVE
        if (status === 'INACTIVE' || status === 'SUSPENDED') {
            user.deactivate();
        }

        return user;
    }

    /**
     * Create a SUPERADMIN user entity
     * @param email Optional email (default: 'admin@test.com')
     * @param username Optional username (default: 'superadmin')
     * @returns A SUPERADMIN user entity
     */
    static createSuperAdmin(
        email: string = 'admin@test.com'
    ): UserEntity {
        return this.createUser(
            undefined, // No customer ID for SUPERADMIN
            email,
            'SUPERADMIN',
            'ACTIVE'
        );
    }

    /**
     * Create a ADMIN user entity
     * @param customerId Customer ID
     * @param email Optional email (default: 'admin@test.com')
     * @param username Optional username (default: 'customeradmin')
     * @returns A ADMIN user entity
     */
    static createCustomerAdmin(
        customerId: CustomerId,
        email: string = 'admin@test.com'
    ): UserEntity {
        return this.createUser(
            customerId,
            email,
            'ADMIN',
            'ACTIVE'
        );
    }

    /**
     * Create a regular USER entity
     * @param customerId Customer ID
     * @param email Optional email (default: 'user@test.com')
     * @param username Optional username (default: 'regularuser')
     * @returns A USER entity
     */
    static createRegularUser(
        customerId: CustomerId,
        email: string = 'user@test.com'
    ): UserEntity {
        return this.createUser(
            customerId,
            email,
            'USER',
            'ACTIVE'
        );
    }

    /**
     * Create a READONLY user entity
     * @param customerId Customer ID
     * @param email Optional email (default: 'readonly@test.com')
     * @param username Optional username (default: 'readonlyuser')
     * @returns A READONLY user entity
     */
    static createReadOnlyUser(
        customerId: CustomerId,
        email: string = 'readonly@test.com'
    ): UserEntity {
        return this.createUser(
            customerId,
            email,
            'READONLY',
            'ACTIVE'
        );
    }

    /**
     * Create a suspended user entity
     * @param customerId Customer ID
     * @param email Optional email (default: 'suspended@test.com')
     * @param username Optional username (default: 'suspendeduser')
     * @returns A suspended user entity
     */
    static createSuspendedUser(
        customerId: CustomerId,
        email: string = 'suspended@test.com'
    ): UserEntity {
        return this.createUser(
            customerId,
            email,
            'USER',
            'SUSPENDED'
        );
    }

    /**
     * Create an inactive user entity
     * @param customerId Customer ID
     * @param email Optional email (default: 'inactive@test.com')
     * @param username Optional username (default: 'inactiveuser')
     * @returns An inactive user entity
     */
    static createInactiveUser(
        customerId: CustomerId,
        email: string = 'inactive@test.com'
    ): UserEntity {
        return this.createUser(
            customerId,
            email,
            'USER',
            'INACTIVE'
        );
    }

    /**
     * Create multiple users for testing
     * @param customerId Customer ID
     * @param count The number of users to create
     * @returns An array of user entities
     */
    static createMultipleUsers(customerId: CustomerId, count: number): UserEntity[] {
        const users: UserEntity[] = [];

        for (let i = 0; i < count; i++) {
            users.push(this.createUser(
                customerId,
                `user${i + 1}@test.com`,
                'USER',
                'ACTIVE'
            ));
        }

        return users;
    }

    /**
     * Create a user ID
     * @param id Optional ID value (generated if not provided)
     * @returns A user ID value object
     */
    static createUserId(id?: string): UserId {
        return UserId.create(id || crypto.randomUUID());
    }

    /**
     * Create an email value object
     * @param email The email value (default: 'test@example.com')
     * @returns An email value object
     */
    static createEmail(email: string = 'test@example.com'): Email {
        return Email.create(email);
    }


    /**
     * Create a user role value object
     * @param role The role value (default: 'USER')
     * @returns A user role value object
     */
    static createUserRole(role: string = 'USER'): UserRole {
        return UserRole.fromString(role);
    }

    /**
     * Create a user status string
     * @param status The status value (default: ACTIVE)
     * @returns A user status string
     */
    static createUserStatus(status: string = 'ACTIVE'): string {
        return status;
    }
}
