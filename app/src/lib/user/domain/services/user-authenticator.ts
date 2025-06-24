import {User} from '../entities/user.entity';
import {Email} from '../value-objects/email.vo';
import {Password} from '../value-objects/password.vo';
import {UserRepository} from '../interfaces/user-repository.interface';
import {PasswordHasher} from './password-hasher';
import {InvalidCredentialsException} from '../exceptions/invalid-credentials.exception';
import {UserSession} from '../entities/user-session.entity';
import {SessionRepository} from '../interfaces/session-repository.interface';

export class UserAuthenticator {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly tokenGenerator: (user: User) => Promise<string>,
        private readonly sessionDuration: number = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    ) {}

    async authenticate(
        email: Email,
        password: Password,
        ipAddress: string,
        userAgent: string
    ): Promise<UserSession> {
        const user = await this.userRepository.findByEmail(email);
        
        if (!user) {
            throw new InvalidCredentialsException();
        }

        if (!user.isActive()) {
            throw new InvalidCredentialsException('User account is inactive');
        }

        const isPasswordValid = await this.passwordHasher.compare(
            password,
            user.getPassword()
        );

        if (!isPasswordValid) {
            throw new InvalidCredentialsException();
        }

        // Record login
        user.recordLogin();
        await this.userRepository.save(user);

        // Generate token
        const token = await this.tokenGenerator(user);
        
        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setTime(expiresAt.getTime() + this.sessionDuration);

        // Create session
        const session = UserSession.create(
            user.getId(),
            token,
            expiresAt,
            ipAddress,
            userAgent
        );

        // Save session
        await this.sessionRepository.save(session);

        return session;
    }

    async validateSession(token: string): Promise<User | null> {
        const session = await this.sessionRepository.findByToken(token);

        if (!session || !session.isValid()) {
            return null;
        }

        return this.userRepository.findById(session.getUserId());
    }

    async logout(token: string): Promise<void> {
        const session = await this.sessionRepository.findByToken(token);

        if (session && !session.isRevoked()) {
            session.revoke();
            await this.sessionRepository.save(session);
        }
    }
}