import {Command} from '@/lib/shared/application/interfaces/command.interface';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

export class AuthenticateUserCommand implements Command {
    private constructor(
        public readonly email: Email,
        public readonly password: Password,
        public readonly customerId: CustomerId | null
    ) {}

    static create(
        email: string,
        password: string,
        customerId?: string
    ): AuthenticateUserCommand {
        return new AuthenticateUserCommand(
            Email.create(email),
            Password.create(password),
            customerId ? CustomerId.create(customerId) : null
        );
    }

    static createForTenant(
        email: string,
        password: string,
        customerId: string
    ): AuthenticateUserCommand {
        return new AuthenticateUserCommand(
            Email.create(email),
            Password.create(password),
            CustomerId.create(customerId)
        );
    }

    static createSuperAdmin(
        email: string,
        password: string
    ): AuthenticateUserCommand {
        return new AuthenticateUserCommand(
            Email.create(email),
            Password.create(password),
            null
        );
    }
}
