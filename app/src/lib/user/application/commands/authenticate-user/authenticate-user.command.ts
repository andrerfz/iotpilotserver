import {Command} from '@/lib/shared/application/interfaces/command.interface';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';

export class AuthenticateUserCommand implements Command {
    private constructor(
        public readonly email: Email,
        public readonly password: Password,
        public readonly ipAddress: string,
        public readonly userAgent: string
    ) {}

    static create(
        email: string,
        password: string,
        ipAddress: string,
        userAgent: string
    ): AuthenticateUserCommand {
        return new AuthenticateUserCommand(
            Email.create(email),
            Password.create(password),
            ipAddress,
            userAgent
        );
    }
}
