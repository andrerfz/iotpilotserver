import {Query} from '@/lib/shared/application/interfaces/query.interface';

/**
 * Query for validating a user session
 */
export class ValidateSessionQuery implements Query<SessionValidationResult> {
  /** Static type identifier that survives minification */
  static readonly type = 'ValidateSessionQuery';

  private constructor(
    public readonly token: string
  ) {}

  static create(token: string): ValidateSessionQuery {
    if (!token || token.trim() === '') {
      throw new Error('Token is required for session validation');
    }
    return new ValidateSessionQuery(token);
  }
}

/**
 * Result of session validation
 */
export interface SessionValidationResult {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    customerId: string | null;
  };
  session?: {
    id: string;
    expiresAt: Date;
  };
}