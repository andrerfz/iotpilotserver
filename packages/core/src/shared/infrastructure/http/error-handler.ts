import {z} from 'zod';
import {DomainException} from '@iotpilot/core/shared/domain/exceptions/domain.exception';

export interface ApiErrorResponse {
    error: string;
    code?: string;
    details?: any;
    timestamp: string;
    correlationId?: string;
}

export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503,
}

const ERROR_STATUS_MAP: Record<string, number> = {
    // 400
    'ValidationException': HttpStatus.BAD_REQUEST,
    'InvalidInputException': HttpStatus.BAD_REQUEST,
    'InvalidEmailException': HttpStatus.BAD_REQUEST,
    'InvalidPasswordException': HttpStatus.BAD_REQUEST,
    'PasswordTooWeakException': HttpStatus.BAD_REQUEST,
    'CannotDowngradeSuperadminException': HttpStatus.BAD_REQUEST,
    'CannotDeleteSelfException': HttpStatus.BAD_REQUEST,
    'CannotDeleteSuperadminException': HttpStatus.BAD_REQUEST,
    'CustomerInvalidStatusException': HttpStatus.BAD_REQUEST,
    'CustomerInvalidSettingsException': HttpStatus.BAD_REQUEST,
    'ValueObjectValidationException': HttpStatus.BAD_REQUEST,
    'InvalidDeviceDataException': HttpStatus.BAD_REQUEST,
    'ZodError': HttpStatus.BAD_REQUEST,
    // 401
    'UnauthorizedException': HttpStatus.UNAUTHORIZED,
    'InvalidCredentialsException': HttpStatus.UNAUTHORIZED,
    'SessionExpiredException': HttpStatus.UNAUTHORIZED,
    'InvalidSessionException': HttpStatus.UNAUTHORIZED,
    // 403
    'ForbiddenException': HttpStatus.FORBIDDEN,
    'TenantAccessDeniedException': HttpStatus.FORBIDDEN,
    'CrossTenantAccessException': HttpStatus.FORBIDDEN,
    'TenantInactiveException': HttpStatus.FORBIDDEN,
    'TenantSuspendedException': HttpStatus.FORBIDDEN,
    'TenantOperationNotAllowedException': HttpStatus.FORBIDDEN,
    'InsufficientPermissionsException': HttpStatus.FORBIDDEN,
    'UnauthorizedDeviceAccessException': HttpStatus.FORBIDDEN,
    'DeviceAccessDeniedException': HttpStatus.FORBIDDEN,
    'CustomerDeactivatedException': HttpStatus.FORBIDDEN,
    'CustomerSuspendedException': HttpStatus.FORBIDDEN,
    'UserInactiveException': HttpStatus.FORBIDDEN,
    // 404
    'NotFoundException': HttpStatus.NOT_FOUND,
    'DeviceNotFoundException': HttpStatus.NOT_FOUND,
    'UserNotFoundException': HttpStatus.NOT_FOUND,
    'CustomerNotFoundException': HttpStatus.NOT_FOUND,
    'TenantNotFoundException': HttpStatus.NOT_FOUND,
    'ApiKeyNotFoundException': HttpStatus.NOT_FOUND,
    'AlertNotFoundException': HttpStatus.NOT_FOUND,
    'NotificationNotFoundException': HttpStatus.NOT_FOUND,
    // 409
    'ConflictException': HttpStatus.CONFLICT,
    'DuplicateEntityException': HttpStatus.CONFLICT,
    'UserAlreadyExistsException': HttpStatus.CONFLICT,
    'EmailAlreadyInUseException': HttpStatus.CONFLICT,
    'DeviceAlreadyExistsException': HttpStatus.CONFLICT,
    'DeviceAlreadyActiveException': HttpStatus.CONFLICT,
    'DeviceAlreadyInactiveException': HttpStatus.CONFLICT,
    'CustomerAlreadyExistsException': HttpStatus.CONFLICT,
    'NotificationAlreadyTerminalException': HttpStatus.CONFLICT,
    // 410
    'UserDeletedException': 410,
    // 423
    'AccountLockedException': 423,
    // 429
    'TooManyFailedAttemptsException': HttpStatus.TOO_MANY_REQUESTS,
    'MaxSessionsExceededException': HttpStatus.TOO_MANY_REQUESTS,
    'ApiKeyLimitExceededException': HttpStatus.TOO_MANY_REQUESTS,
    'TenantQuotaExceededException': HttpStatus.TOO_MANY_REQUESTS,
    'RateLimitExceededException': HttpStatus.TOO_MANY_REQUESTS,
    // 503
    'SSHConnectionFailedException': HttpStatus.SERVICE_UNAVAILABLE,
};

export function mapErrorToHttpStatus(error: unknown): number {
    if (error instanceof z.ZodError) return HttpStatus.BAD_REQUEST;

    if (error instanceof Error) {
        const mapped = ERROR_STATUS_MAP[error.constructor.name];
        if (mapped) return mapped;

        const msg = error.message.toLowerCase();
        if (msg.includes('not found')) return HttpStatus.NOT_FOUND;
        if (msg.includes('unauthorized') || msg.includes('invalid credentials')) return HttpStatus.UNAUTHORIZED;
        if (msg.includes('forbidden') || msg.includes('access denied') || msg.includes('belongs to another')) return HttpStatus.FORBIDDEN;
        if (msg.includes('already exists') || msg.includes('duplicate')) return HttpStatus.CONFLICT;
        if (msg.includes('invalid') || msg.includes('required')) return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
}

export function extractErrorDetails(error: unknown): { message: string; code?: string; details?: any } {
    if (error instanceof z.ZodError) {
        return {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message, code: e.code })),
        };
    }
    if (error instanceof DomainException) {
        return { message: error.message, code: error.code, details: error.details };
    }
    if (error instanceof Error) {
        return { message: error.message, code: error.constructor.name.replace('Exception', '').toUpperCase() };
    }
    return { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' };
}
