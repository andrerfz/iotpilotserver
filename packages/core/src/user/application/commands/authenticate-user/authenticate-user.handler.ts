import {CommandHandler} from '../../../../shared/application/command.handler';
import {AuthenticateUserCommand} from './authenticate-user.command';
import {UserAuthenticator} from '../../../domain/services/user-authenticator';
import {UserEntity} from '../../../domain/entities/user.entity';

// SessionService interface - defined locally to avoid import issues
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
        private readonly sessionService: SessionService
    ) {}

    async handle(command: AuthenticateUserCommand): Promise<AuthenticationResult> {
        console.log(`🔍 AuthenticateUserHandler.handle: START - email: ${command.email.getValue()}, customerId: ${command.customerId?.getValue() || 'null'}`);
        let user: UserEntity | null;
        
        try {
            // Get password value from Password object
            const passwordValue = typeof command.password === 'string' 
                ? command.password 
                : command.password.getValue();
            
            if (command.customerId === null) {
                console.log(`🔍 AuthenticateUserHandler.handle: Using SUPERADMIN authentication`);
                // SUPERADMIN authentication
                user = await this.userAuthenticator.authenticateSuperAdmin(
                    command.email,
                    passwordValue
                );
            } else {
                console.log(`🔍 AuthenticateUserHandler.handle: Using tenant-specific authentication`);
                // Tenant-specific authentication
                user = await this.userAuthenticator.authenticate(
                    command.email,
                    passwordValue,
                    command.customerId
                );
            }
        } catch (error) {
            console.log(`🔍 AuthenticateUserHandler.handle: Authentication failed:`, error);
            throw error;
        }

        if (!user) {
            console.log('🔍 AuthenticateUserHandler.handle: User authentication returned null');
            throw new Error('Invalid credentials - user authentication failed');
        }

        console.log('🔍 AuthenticateUserHandler.handle: User authenticated successfully, creating session');
        
        // Use a transaction to ensure user update and session creation are atomic
        const { PrismaService } = await import('@iotpilot/core/shared/infrastructure/database/prisma.service');
        const prismaService = new PrismaService();
        const result = await prismaService.getClient().$transaction(async (tx: any) => {
            // Update user's last login time
            await tx.user.update({
                where: { id: user!.getId().getValue() },
                data: { lastLoginAt: new Date() }
            });
            
            // Create a new session for the user
            const token = await this.sessionService.createSession(
                user.getId().getValue(),
                user.getCustomerId()?.getValue() || null,
                tx
            );
            
            return token;
        });
        
        console.log('🔍 AuthenticateUserHandler.handle: Session created successfully');

        return {
            user: {
                id: user.getId().getValue(),
                email: user.getEmail().getValue(),
                username: user.getDisplayName(),
                role: user.getRole().getValue(),
                customerId: user.getCustomerId()?.getValue() || null
            },
            token: result
        };
    }
}
