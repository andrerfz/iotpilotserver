import {DomainException} from '../../../shared/domain/exceptions/domain.exception';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';

export abstract class UserException extends DomainException {
  constructor(message: string) {
    super(message);
  }

  abstract getStatusCode(): number;
  abstract getErrorCode(): string;
}

// User existence exceptions
export class UserNotFoundException extends UserException {
  constructor(userId: UserId) {
    super(`User not found: ${userId.getValue()}`);
  }

  getStatusCode(): number {
    return 404;
  }

  getErrorCode(): string {
    return 'USER_NOT_FOUND';
  }
}

export class UserAlreadyExistsException extends UserException {
  constructor(email: Email) {
    super(`User already exists: ${email.getValue()}`);
  }

  getStatusCode(): number {
    return 409;
  }

  getErrorCode(): string {
    return 'USER_ALREADY_EXISTS';
  }
}

// Authentication exceptions
export class InvalidCredentialsException extends UserException {
  constructor() {
    super('Invalid email or password');
  }

  getStatusCode(): number {
    return 401;
  }

  getErrorCode(): string {
    return 'INVALID_CREDENTIALS';
  }
}

export class AccountLockedException extends UserException {
  constructor(userId: UserId, remaining: number) {
    super(`Account locked. Please try again in ${remaining} minutes`);
  }

  getStatusCode(): number {
    return 423;
  }

  getErrorCode(): string {
    return 'ACCOUNT_LOCKED';
  }
}

export class TooManyFailedAttemptsException extends UserException {
  constructor(userId: UserId, attempts: number) {
    super(`Too many failed login attempts (${attempts}/5). Account locked`);
  }

  getStatusCode(): number {
    return 429;
  }

  getErrorCode(): string {
    return 'TOO_MANY_FAILED_ATTEMPTS';
  }
}

export class InvalidPasswordException extends UserException {
  constructor() {
    super('Current password is incorrect');
  }

  getStatusCode(): number {
    return 400;
  }

  getErrorCode(): string {
    return 'INVALID_PASSWORD';
  }
}

export class PasswordTooWeakException extends UserException {
  constructor(requirements: string[]) {
    super(`Password does not meet requirements: ${requirements.join(', ')}`);
  }

  getStatusCode(): number {
    return 400;
  }

  getErrorCode(): string {
    return 'PASSWORD_TOO_WEAK';
  }
}

// Authorization exceptions
export class InsufficientPermissionsException extends UserException {
  constructor(userId: UserId, requiredRole: string, currentRole: string) {
    super(`Insufficient permissions. Required: ${requiredRole}, Current: ${currentRole}`);
  }

  getStatusCode(): number {
    return 403;
  }

  getErrorCode(): string {
    return 'INSUFFICIENT_PERMISSIONS';
  }
}

export class CannotDowngradeSuperadminException extends UserException {
  constructor(userId: UserId) {
    super(`Cannot downgrade SUPERADMIN role for user: ${userId.getValue()}`);
  }

  getStatusCode(): number {
    return 400;
  }

  getErrorCode(): string {
    return 'CANNOT_DOWNGRADE_SUPERADMIN';
  }
}

// Profile exceptions
export class InvalidEmailException extends UserException {
  constructor(email: string) {
    super(`Invalid email format: ${email}`);
  }

  getStatusCode(): number {
    return 400;
  }

  getErrorCode(): string {
    return 'INVALID_EMAIL';
  }
}

export class EmailAlreadyInUseException extends UserException {
  constructor(email: Email) {
    super(`Email already in use: ${email.getValue()}`);
  }

  getStatusCode(): number {
    return 409;
  }

  getErrorCode(): string {
    return 'EMAIL_ALREADY_IN_USE';
  }
}

export class UserInactiveException extends UserException {
  constructor(userId: UserId) {
    super(`User is inactive: ${userId.getValue()}`);
  }

  getStatusCode(): number {
    return 403;
  }

  getErrorCode(): string {
    return 'USER_INACTIVE';
  }
}

export class UserDeletedException extends UserException {
  constructor(userId: UserId) {
    super(`User has been deleted: ${userId.getValue()}`);
  }

  getStatusCode(): number {
    return 410;
  }

  getErrorCode(): string {
    return 'USER_DELETED';
  }
}

export class CannotDeleteSelfException extends UserException {
  constructor(userId: UserId) {
    super(`Cannot delete own account: ${userId.getValue()}`);
  }

  getStatusCode(): number {
    return 400;
  }

  getErrorCode(): string {
    return 'CANNOT_DELETE_SELF';
  }
}

export class CannotDeleteSuperadminException extends UserException {
  constructor(userId: UserId) {
    super(`Cannot delete SUPERADMIN account: ${userId.getValue()}`);
  }

  getStatusCode(): number {
    return 400;
  }

  getErrorCode(): string {
    return 'CANNOT_DELETE_SUPERADMIN';
  }
}

// Session exceptions
export class SessionExpiredException extends UserException {
  constructor(sessionId: string) {
    super(`Session expired: ${sessionId}`);
  }

  getStatusCode(): number {
    return 401;
  }

  getErrorCode(): string {
    return 'SESSION_EXPIRED';
  }
}

export class InvalidSessionException extends UserException {
  constructor(sessionId: string) {
    super(`Invalid session: ${sessionId}`);
  }

  getStatusCode(): number {
    return 401;
  }

  getErrorCode(): string {
    return 'INVALID_SESSION';
  }
}

export class MaxSessionsExceededException extends UserException {
  constructor(userId: UserId, maxSessions: number) {
    super(`Maximum sessions (${maxSessions}) exceeded for user: ${userId.getValue()}`);
  }

  getStatusCode(): number {
    return 429;
  }

  getErrorCode(): string {
    return 'MAX_SESSIONS_EXCEEDED';
  }
}

// API key exceptions (if users can have API keys)
export class ApiKeyNotFoundException extends UserException {
  constructor(apiKeyId: string) {
    super(`API key not found: ${apiKeyId}`);
  }

  getStatusCode(): number {
    return 404;
  }

  getErrorCode(): string {
    return 'API_KEY_NOT_FOUND';
  }
}

export class ApiKeyLimitExceededException extends UserException {
  constructor(userId: UserId, limit: number) {
    super(`API key limit (${limit}) exceeded for user: ${userId.getValue()}`);
  }

  getStatusCode(): number {
    return 429;
  }

  getErrorCode(): string {
    return 'API_KEY_LIMIT_EXCEEDED';
  }
}
