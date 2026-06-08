import {Command} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {Email} from '@iotpilot/core/user/domain/value-objects/email.vo';
import {Password} from '@iotpilot/core/user/domain/value-objects/password.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class AuthenticateUserCommand implements Command {
    /** Static type identifier that survives minification */
    static readonly type = 'AuthenticateUserCommand';

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
            Password.createHashed(password),
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
            Password.createHashed(password),
            CustomerId.create(customerId)
        );
    }

    static createSuperAdmin(
        email: string,
        password: string
    ): AuthenticateUserCommand {
        return new AuthenticateUserCommand(
            Email.create(email),
            Password.createHashed(password),
            null
        );
    }
}
