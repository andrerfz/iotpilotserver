import {Command} from '@/lib/shared/application/interfaces/command.interface';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {UserRole} from '@/lib/user/domain/value-objects/user-role.vo';

export class RegisterUserCommand implements Command {
    private constructor(
        public readonly email: Email,
        public readonly password: Password,
        public readonly role: UserRole
    ) {}

    static create(
        email: string,
        password: string,
        role: string = 'USER'
    ): RegisterUserCommand {
        return new RegisterUserCommand(
            Email.create(email),
            Password.create(password),
            UserRole.create(role)
        );
    }
}
