import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {AuthenticateUserCommand} from './authenticate-user.command';
import {UserAuthenticator} from '@/lib/user/domain/services/user-authenticator';
import {User} from '@/lib/user/domain/entities/user.entity';

export class AuthenticateUserHandler implements CommandHandler<AuthenticateUserCommand, User | null> {
    constructor(
        private readonly userAuthenticator: UserAuthenticator
    ) {}

    async handle(command: AuthenticateUserCommand): Promise<User | null> {
        if (command.customerId === null) {
            // SUPERADMIN authentication
            return await this.userAuthenticator.authenticateSuperAdmin(
                command.email,
                command.password
            );
        } else {
            // Tenant-specific authentication
            return await this.userAuthenticator.authenticate(
                command.email,
                command.password,
                command.customerId
            );
        }
    }
}
