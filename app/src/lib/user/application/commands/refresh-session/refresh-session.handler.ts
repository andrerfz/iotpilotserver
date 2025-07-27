import jwt from 'jsonwebtoken';
import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {RefreshSessionCommand} from './refresh-session.command';
import {SessionRepository} from '@/lib/user/domain/interfaces/session-repository.interface';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {UserSession} from '@/lib/user/domain/entities/user-session.entity';
import {EventBus} from '@/lib/shared/application/bus/event.bus';

export interface RefreshSessionResult {
    token: string;
    user: {
        id: string;
        email: string;
        username: string;
        role: string;
        customerId?: string;
    };
}

export class RefreshSessionHandler implements CommandHandler<RefreshSessionCommand, RefreshSessionResult> {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly userRepository: UserRepository,
        private readonly eventBus: EventBus
    ) {}

    async handle(command: RefreshSessionCommand): Promise<RefreshSessionResult> {
        try {
            console.log('🔄 REFRESH SESSION: Starting refresh process');

            // Validate the refresh token
            let decodedToken: any;
            try {
                decodedToken = jwt.verify(command.refreshToken, process.env.JWT_SECRET!);
            } catch (error) {
                throw new Error('Invalid or expired refresh token');
            }

            // Find the session
            const session = await this.sessionRepository.findByToken(command.refreshToken);
            if (!session) {
                throw new Error('Session not found');
            }

            // Check if session is expired
            if (session.isExpired()) {
                await this.sessionRepository.delete(session.getId());
                throw new Error('Session expired');
            }

            // Get user details
            const user = await this.userRepository.findById(session.getUserId());
            if (!user) {
                throw new Error('User not found');
            }

            // Generate new JWT token
            const newToken = jwt.sign(
                {
                    userId: user.getId().getValue(),
                    email: user.getEmail().getValue(),
                    role: user.getRole().getValue(),
                    customerId: user.getCustomerId()?.getValue()
                },
                process.env.JWT_SECRET!,
                { expiresIn: '24h' }
            );

            // Update session with new token
            const updatedSession = UserSession.create(
                session.getUserId(),
                user.getCustomerId() || null,
                newToken,
                24 // 24 hours
            );

            await this.sessionRepository.delete(session.getId());
            await this.sessionRepository.save(updatedSession);

            console.log('✅ REFRESH SESSION: Session refreshed successfully', {
                userId: user.getId().getValue(),
                customerId: user.getCustomerId()?.getValue()
            });

            return {
                token: newToken,
                user: {
                    id: user.getId().getValue(),
                    email: user.getEmail().getValue(),
                    username: user.getDisplayName(),
                    role: user.getRole().getValue(),
                    customerId: user.getCustomerId()?.getValue()
                }
            };

        } catch (error) {
            console.error('❌ REFRESH SESSION: Failed to refresh session:', error);
            throw error;
        }
    }
}