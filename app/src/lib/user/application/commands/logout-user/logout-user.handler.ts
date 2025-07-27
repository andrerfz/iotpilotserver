import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {LogoutUserCommand} from './logout-user.command';
import {SessionRepository} from '@/lib/user/domain/interfaces/session-repository.interface';
import {UserLoggedOutEvent} from '@/lib/user/domain/events/user-logged-out.event';
import {EventBus} from '@/lib/shared/application/bus/event.bus';

export class LogoutUserHandler implements CommandHandler<LogoutUserCommand, void> {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly eventBus: EventBus
    ) {}

    async handle(command: LogoutUserCommand): Promise<void> {
        try {
            console.log('🔐 LOGOUT USER: Starting logout process', {
                userId: command.userId.getValue(),
                hasSessionToken: !!command.sessionToken,
                customerId: command.tenantCustomerId
            });

            // If session token provided, invalidate specific session
            if (command.sessionToken) {
                const session = await this.sessionRepository.findByToken(command.sessionToken);
                if (session && session.getUserId().equals(command.userId)) {
                    await this.sessionRepository.delete(session.getId());
                    console.log('🗑️ LOGOUT USER: Specific session invalidated');
                }
            } else {
                // Otherwise, invalidate all sessions for the user
                await this.sessionRepository.revokeAllForUser(command.userId);
                console.log('🗑️ LOGOUT USER: All user sessions invalidated');
            }

            // Publish domain event
            const loggedOutEvent = new UserLoggedOutEvent(
                command.userId,
                command.sessionToken,
                command.tenantCustomerId
            );
            
            await this.eventBus.publish(loggedOutEvent);

            console.log('✅ LOGOUT USER: User logged out successfully', {
                userId: command.userId.getValue(),
                customerId: command.tenantCustomerId
            });

        } catch (error) {
            console.error('❌ LOGOUT USER: Failed to logout user:', error);
            throw error;
        }
    }
}