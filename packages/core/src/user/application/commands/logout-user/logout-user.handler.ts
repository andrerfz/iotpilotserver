import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {LogoutUserCommand} from './logout-user.command';
import {SessionRepository} from '@iotpilot/core/user/domain/interfaces/session-repository.interface';
import {UserLoggedOutEvent} from '@iotpilot/core/user/domain/events/user-logged-out.event';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';

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

            // Publish domain event. It is tenant-scoped, so it only applies when
            // the user belongs to a tenant. A SUPERADMIN has no customerId; there
            // is no valid tenant to scope the event to (and the session is already
            // invalidated above), so we skip it rather than fabricate an invalid
            // CustomerId.
            if (command.tenantCustomerId) {
                const loggedOutEvent = new UserLoggedOutEvent(
                    command.userId,
                    command.sessionToken,
                    command.tenantCustomerId
                );

                await this.eventBus.publish(loggedOutEvent);
            }

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