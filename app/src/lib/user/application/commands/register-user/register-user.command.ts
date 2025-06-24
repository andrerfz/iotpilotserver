import {Command} from '@/lib/shared/application/interfaces/command.interface';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {UserRole} from '@/lib/user/domain/value-objects/user-role.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

export class RegisterUserCommand implements Command {
    private constructor(
        public readonly email: Email,
        public readonly password: Password,
        public readonly role: UserRole,
        public readonly customerId: CustomerId | null,
        public readonly username?: string
    ) {}

    static create(
        email: string,
        password: string,
        role: string = 'USER',
        customerId?: string,
        username?: string
    ): RegisterUserCommand {
        const userRole = UserRole.create(role);

        // SUPERADMIN cannot have customerId
        if (userRole.isSuperAdmin() && customerId) {
            throw new Error('SUPERADMIN users cannot be associated with a customer');
        }

        // Non-SUPERADMIN must have customerId
        if (!userRole.isSuperAdmin() && !customerId) {
            throw new Error('Non-SUPERADMIN users must be associated with a customer');
        }

        return new RegisterUserCommand(
            Email.create(email),
            Password.create(password),
            userRole,
            customerId ? CustomerId.create(customerId) : null,
            username
        );
    }

    static createForTenant(
        email: string,
        password: string,
        customerId: string,
        role: string = 'USER',
        username?: string
    ): RegisterUserCommand {
        const userRole = UserRole.create(role);

        if (userRole.isSuperAdmin()) {
            throw new Error('Cannot create SUPERADMIN users for tenants');
        }

        return new RegisterUserCommand(
            Email.create(email),
            Password.create(password),
            userRole,
            CustomerId.create(customerId),
            username
        );
    }

    static createSuperAdmin(
        email: string,
        password: string,
        username?: string
    ): RegisterUserCommand {
        return new RegisterUserCommand(
            Email.create(email),
            Password.create(password),
            UserRole.superAdmin(),
            null,
            username
        );
    }
}
