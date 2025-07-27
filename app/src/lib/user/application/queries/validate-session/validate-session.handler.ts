import {QueryHandler} from '@/lib/shared/application/interfaces/query.interface';
import {SessionValidationResult, ValidateSessionQuery} from './validate-session.query';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {SessionRepository} from '@/lib/user/domain/interfaces/session-repository.interface';

/**
 * Handler for validating user sessions
 */
export class ValidateSessionHandler implements QueryHandler<ValidateSessionQuery, SessionValidationResult> {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Handles the validate session query
   * @param query The validate session query
   * @returns The session validation result
   */
  async handle(query: ValidateSessionQuery): Promise<SessionValidationResult> {
    try {
      process.stdout.write(`🔍 ValidateSessionHandler.handle: Starting with token: ${query.token}\n`);
      
      // Find the session by token
      process.stdout.write(`🔍 ValidateSessionHandler.handle: Calling sessionRepository.findByToken\n`);
      const session = await this.sessionRepository.findByToken(query.token);
      process.stdout.write(`🔍 ValidateSessionHandler.handle: SessionRepository.findByToken completed\n`);
      
      if (!session) {
        process.stdout.write(`❌ ValidateSessionHandler.handle: Session not found for token\n`);
        return { valid: false };
      }

      process.stdout.write(`✅ ValidateSessionHandler.handle: Session found, checking expiration\n`);
      
      // Check if session is expired
      try {
        const now = new Date();
        const expiresAt = session.getExpiresAt();
        const isExpired = session.isExpired();
        process.stdout.write(`🔍 ValidateSessionHandler.handle: Expiration check - now=${now}, expiresAt=${expiresAt}, isExpired=${isExpired}\n`);
        
        if (isExpired) {
          process.stdout.write(`❌ ValidateSessionHandler.handle: Session is expired\n`);
          return { valid: false };
        }
      } catch (error) {
        process.stdout.write(`❌ ValidateSessionHandler.handle: Error during expiration check: ${(error as any)?.message}\n`);
        return { valid: false };
      }

      process.stdout.write(`✅ ValidateSessionHandler.handle: Session not expired, looking for user\n`);
      
      // Get the user associated with the session
      const user = await this.userRepository.findById(session.getUserId());
      
      if (!user) {
        process.stdout.write(`❌ ValidateSessionHandler.handle: User not found for session\n`);
        return { valid: false };
      }
      
      if (!user.isActive) {
        process.stdout.write(`❌ ValidateSessionHandler.handle: User is not active\n`);
        return { valid: false };
      }

      process.stdout.write(`✅ ValidateSessionHandler.handle: User found and active, validation successful\n`);

      return {
        valid: true,
        user: {
          id: user.getId().getValue(),
          email: user.getEmail().getValue(),
          username: user.getDisplayName(),
          role: user.getRole().getValue(),
          customerId: user.getCustomerId()?.getValue() || null
        },
        session: {
          id: session.getId().getValue(),
          expiresAt: session.getExpiresAt()
        }
      };
    } catch (error) {
      process.stdout.write(`❌ ValidateSessionHandler.handle: Exception caught: ${(error as any)?.message}\n`);
      process.stdout.write(`❌ ValidateSessionHandler.handle: Stack trace: ${(error as any)?.stack}\n`);
      console.error('Failed to validate session:', error);
      return { valid: false };
    }
  }
}