import {CommandHandler} from '../../../../shared/application/command.handler';
import {AuthenticateUserCommand} from './authenticate-user.command';
import {UserAuthenticator} from '../../../domain/services/user-authenticator';
import {UserEntity} from '../../../domain/entities/user.entity';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {UserAuthenticatedEvent} from '../../../domain/events/user-authenticated.event';

interface SessionService {
    createSession(userId: string, customerId?: string | null, tx?: any): Promise<string>;
}

export interface AuthenticationResult {
    user: {
        id: string;
        email: string;
        username: string;
        role: string;
        customerId: string | null;
    };
    token: string;
}

export class AuthenticateUserHandler implements CommandHandler<AuthenticateUserCommand, AuthenticationResult> {
    constructor(
        private readonly userAuthenticator: UserAuthenticator,
        private readonly sessionService: SessionService,
        private readonly eventBus: EventBus
    ) {}

    async handle(command: AuthenticateUserCommand): Promise<AuthenticationResult> {
        let user: UserEntity | null;

        const passwordValue = typeof command.password === 'string'
            ? command.password
            : command.password.getValue();

        if (command.customerId === null) {
            user = await this.userAuthenticator.authenticateSuperAdmin(
                command.email,
                passwordValue
            );
        } else {
            user = await this.userAuthenticator.authenticate(
                command.email,
                passwordValue,
                command.customerId
            );
        }

        if (!user) {
            throw new Error('Invalid credentials - user authentication failed');
        }

        const { PrismaService } = await import('@iotpilot/core/shared/infrastructure/database/prisma.service');
        const prismaService = new PrismaService();
        const token = await prismaService.getClient().$transaction(async (tx: any) => {
            await tx.user.update({
                where: { id: user!.getId().getValue() },
                data: { lastLoginAt: new Date() }
            });

            return this.sessionService.createSession(
                user!.getId().getValue(),
                user!.getCustomerId()?.getValue() || null,
                tx
            );
        });

        await this.eventBus.publish(new UserAuthenticatedEvent(
            user.getId(),
            user.getEmail()
        ));

        return {
            user: {
                id: user.getId().getValue(),
                email: user.getEmail().getValue(),
                username: user.getDisplayName(),
                role: user.getRole().getValue(),
                customerId: user.getCustomerId()?.getValue() || null
            },
            token
        };
    }
}
