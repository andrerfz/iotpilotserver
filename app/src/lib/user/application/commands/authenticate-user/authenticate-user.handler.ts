import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {AuthenticateUserCommand} from './authenticate-user.command';
import {UserAuthenticator} from '@/lib/user/domain/services/user-authenticator';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {EventBus} from '@/lib/shared/application/bus/event.bus';
import {UserLoggedInEvent} from '@/lib/user/domain/events/user-logged-in.event';

export class AuthenticateUserHandler implements CommandHandler<AuthenticateUserCommand, string> {
    constructor(
        private readonly userAuthenticator: UserAuthenticator,
        private readonly eventBus: EventBus
    ) {}

    async handle(command: AuthenticateUserCommand): Promise<string> {
        const session = await this.userAuthenticator.authenticate(
            command.email,
            command.password,
            command.ipAddress,
            command.userAgent
        );

        // Publish event
        await this.eventBus.publish(new UserLoggedInEvent(
            session.getUserId().getValue(),
            session.getId().getValue(),
            command.ipAddress
        ));

        return session.getToken();
    }
}
