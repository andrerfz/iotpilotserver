import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { send } from '../http/response.util';
import { validator } from '@iotpilot/core/shared/infrastructure/validation/validation-helper';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { AppContainer } from '@iotpilot/core/shared/infrastructure/container/app-container';
import { CryptoService } from '@iotpilot/core/shared/domain/interfaces/crypto-service.interface';
import { ListApiKeysQuery } from '@iotpilot/core/user/application/queries/list-api-keys/list-api-keys.query';
import { CreateApiKeyCommand } from '@iotpilot/core/user/application/commands/create-api-key/create-api-key.command';
import { RefreshSessionCommand } from '@iotpilot/core/user/application/commands/refresh-session/refresh-session.command';
import { RefreshSessionResult } from '@iotpilot/core/user/application/commands/refresh-session/refresh-session.handler';
import { ValidateSessionQuery, SessionValidationResult } from '@iotpilot/core/user/application/queries/validate-session/validate-session.query';
import { prisma } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { BcryptPasswordHasher } from '@iotpilot/core/user/infrastructure/services/bcrypt-password-hasher';
import { Password } from '@iotpilot/core/user/domain/value-objects/password.vo';
import { Pagination } from '@iotpilot/core/shared/infrastructure/http/pagination.util';
import { Prisma } from '@prisma/client';
import { logger } from '@iotpilot/core/shared/infrastructure/logging/logger.service';
import { authenticate } from '@iotpilot/core/shared/infrastructure/authentication/auth.service';
import { z } from 'zod';

const isoTimestamp = () => new Date().toISOString();

// ─── Validation schemas ────────────────────────────────────────────────────────

const v = validator();

const loginSchema = v.object({
    email: v.string({ email: true }),
    password: v.string({ min: 1 }),
    remember: v.optional(v.boolean()),
});

const complexPasswordSchema = z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/\d/, 'Password must contain a number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain a special character');

const registrationSchema = v.object({
    email: v.string({ email: true }),
    username: v.string({ min: 3, max: 50 }),
    password: (v as any).fromZodSchema(complexPasswordSchema),
});

const refreshSchema = v.object({
    refreshToken: v.optional(v.string()),
    remember: v.optional(v.boolean()),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/\d/, 'Password must contain at least one number'),
});

const createApiKeySchema = v.object({
    name: v.string({ min: 1, max: 100 }),
    expiresAt: v.optional(v.string({ datetime: true })),
});

const verifySchema = z.object({
    userId: z.string().min(1),
    code: z.string().length(6),
    remember: z.boolean().optional(),
});

// ─── Structured logger for api-keys ───────────────────────────────────────────

interface LogContext {
    event: string;
    userId?: string;
    customerId?: string;
    keyId?: string;
    correlationId?: string;
    [key: string]: unknown;
}

type LogLevel = 'info' | 'warn' | 'error';

const getSafeErrorInfo = (error: unknown) => {
    if (error instanceof Error) {
        return { message: error.message, type: error.constructor.name, stack: error.stack };
    }
    return { message: error ? String(error) : 'Unknown error occurred', type: 'UnknownError', stack: undefined };
};

const apiKeysLogger = (() => {
    const log = (level: LogLevel, message: string, context?: LogContext) => {
        const safeContext = { ...context };
        delete (safeContext as any).key;
        delete (safeContext as any).password;
        delete (safeContext as any).token;
        const logEntry = { level, module: 'api-keys-route', timestamp: isoTimestamp(), message, ...safeContext };
        const jsonLog = JSON.stringify(logEntry);
        switch (level) {
            case 'error': console.error(jsonLog); break;
            case 'warn': console.warn(jsonLog); break;
            default: console.log(jsonLog); break;
        }
    };
    return {
        info: (message: string, context?: LogContext) => log('info', message, context),
        warn: (message: string, context?: LogContext) => log('warn', message, context),
        error: (message: string, context?: LogContext) => log('error', message, context),
    };
})();

// ─── Router ───────────────────────────────────────────────────────────────────

export const authRouter = Router();

// POST /auth/login
authRouter.post('/login', async (req: AuthenticatedRequest, res: Response) => {
    const clientIP = (req.headers['x-forwarded-for'] as string | undefined) ||
                     (req.headers['x-real-ip'] as string | undefined) ||
                     'unknown';
    const userAgent = (req.headers['user-agent'] as string | undefined) || 'unknown';

    try {
        logger.info('Authentication attempt', {
            email: 'pending',
            ipAddress: clientIP,
            userAgent,
            endpoint: 'login',
        });

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();
        const queryBus = serviceContainer.getQueryBus();
        const userRepository = serviceContainer.getUserRepository();

        const body = req.body;
        const { email, password, remember } = loginSchema.parse(body);

        logger.debug('Login validation passed', { email, remember: !!remember, ipAddress: clientIP });

        const tenantContext = TenantContextImpl.createSuperAdmin();

        const { AuthenticateUserCommand } = await import('@iotpilot/core/user/application/commands/authenticate-user/authenticate-user.command');
        const { GetCustomerByDomainQuery } = await import('@iotpilot/core/customer/application/queries/get-customer-by-domain/get-customer-by-domain.query');
        const { Email } = await import('@iotpilot/core/user/domain/value-objects/email.vo');

        interface AuthenticationResult {
            user: {
                id: string;
                email: string;
                username: string;
                role: string;
                customerId: string | null;
            };
            token: string;
        }

        let authenticateCommand;

        try {
            const emailVO = Email.fromString(email);
            const existingUser = await userRepository.findByEmail(emailVO, tenantContext);

            if (!existingUser) {
                logger.warn('User not found', { email, ipAddress: clientIP });
                send.unauthorized(res, 'Invalid credentials');
                return;
            }

            if (existingUser.isSuperAdmin()) {
                logger.debug('Authenticating SUPERADMIN user', { email });
                authenticateCommand = AuthenticateUserCommand.createSuperAdmin(email, password);
            } else {
                let customerId: string | null = existingUser.getCustomerId()?.getValue() || null;

                if (!customerId) {
                    const emailDomain = email.split('@')[1];
                    const getCustomerQuery = GetCustomerByDomainQuery.create(emailDomain, tenantContext);
                    const customerResult = await queryBus.execute(getCustomerQuery);

                    if (!customerResult) {
                        logger.warn('Customer not found for domain', { emailDomain, ipAddress: clientIP });
                        send.unauthorized(res, 'Invalid credentials');
                        return;
                    }

                    customerId = customerResult.getId().getValue();
                }

                if (!customerId) {
                    logger.warn('Customer ID could not be resolved', { email, ipAddress: clientIP });
                    send.unauthorized(res, 'Invalid credentials - no customer found');
                    return;
                }

                logger.debug('Creating AuthenticateUserCommand for tenant user', { email, customerId });
                authenticateCommand = AuthenticateUserCommand.createForTenant(email, password, customerId);
            }

            logger.debug('AuthenticateUserCommand created successfully');
        } catch (error) {
            logger.error('Error in authentication setup', error instanceof Error ? error : undefined, { ipAddress: clientIP });
            if (error instanceof Error && error.message.includes('Password must contain')) {
                send.badRequest(res, 'Invalid password format');
                return;
            }
            send.unauthorized(res, 'Invalid credentials');
            return;
        }

        logger.debug('Executing authentication command', {
            email,
            commandType: authenticateCommand.constructor.name,
            ipAddress: clientIP,
        });

        const authResult = await commandBus.execute<typeof authenticateCommand, AuthenticationResult>(authenticateCommand);

        logger.info('User authenticated successfully', {
            userId: authResult.user.id,
            email: authResult.user.email,
            role: authResult.user.role,
            customerId: authResult.user.customerId || undefined,
            ipAddress: clientIP,
            userAgent,
        });

        logger.logLoginAttempt(authResult.user.id, authResult.user.customerId || undefined, clientIP, true, userAgent);

        const userRecord = await serviceContainer.getPrismaClient().getClient().user.findUnique({
            where: { id: authResult.user.id },
            select: { twoFactorEnabled: true, publicId: true },
        });
        const userPublicId = userRecord?.publicId || authResult.user.id;

        if (userRecord?.twoFactorEnabled) {
            await serviceContainer.getPrismaClient().getClient().session.updateMany({
                where: { userId: authResult.user.id, deletedAt: null },
                data: { deletedAt: new Date() },
            });

            const { SendVerificationCodeCommand } = await import(
                '@iotpilot/core/user/application/commands/send-verification-code/send-verification-code.command'
            );
            await commandBus.execute(
                SendVerificationCodeCommand.create(authResult.user.id, authResult.user.email, 'TWO_FACTOR')
            );

            logger.info('2FA code sent, awaiting verification', { userId: authResult.user.id, ipAddress: clientIP });

            send.ok(res, {
                requiresTwoFactor: true,
                userId: authResult.user.id,
                message: 'Verification code sent to your email',
            });
            return;
        }

        const isHttps = (req.headers['x-forwarded-proto'] as string | undefined) === 'https' ||
            (req.protocol === 'https');

        res.cookie('auth-token', authResult.token, {
            httpOnly: true,
            secure: isHttps,
            sameSite: 'lax',
            maxAge: (remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60) * 1000,
            path: '/',
        });

        logger.debug('Login completed successfully', { userId: authResult.user.id, email: authResult.user.email, ipAddress: clientIP });

        send.ok(res, {
            user: {
                id: userPublicId,
                email: authResult.user.email,
                username: authResult.user.username,
                role: authResult.user.role,
                customerId: authResult.user.customerId,
            },
            token: authResult.token,
        });
        return;

    } catch (error) {
        logger.error('Login failed', error instanceof Error ? error : undefined, {
            email: 'parsed_from_body',
            ipAddress: clientIP,
            userAgent,
            errorType: error instanceof Error ? error.name : 'Unknown',
            securityEvent: 'LOGIN_FAILURE',
        });

        logger.logLoginAttempt('unknown', undefined, clientIP, false, userAgent);

        if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as any).errors)) {
            logger.warn('Login validation failed', { error: 'Invalid input format', ipAddress: clientIP });
            send.badRequest(res, 'Invalid input', (error as any).errors);
            return;
        }

        if (error instanceof Error) {
            if (error.message.startsWith('USER_NOT_ACTIVE:')) {
                const emailAddr = error.message.split(':')[1];
                try {
                    const userRow = await ServiceContainer.getInstance().getPrismaClient().getClient().user.findFirst({
                        where: { email: emailAddr },
                        select: { status: true },
                    });
                    const statusMsg: Record<string, string> = {
                        PENDING: 'Your account is awaiting admin approval.',
                        SUSPENDED: 'Your account has been suspended. Contact your administrator.',
                        INACTIVE: 'Your account has been deactivated. Contact your administrator.',
                    };
                    const msg = statusMsg[(userRow?.status as string) ?? ''] ?? 'Your account is not active.';
                    send.unauthorized(res, msg);
                    return;
                } catch {
                    send.unauthorized(res, 'Your account is not active.');
                    return;
                }
            }

            if (error.message.includes('Invalid credentials') ||
                error.message.includes('not found') ||
                error.message.includes('Password verification failed')) {
                logger.warn('Invalid credentials attempt', { error: error.message, ipAddress: clientIP, userAgent });
                send.unauthorized(res, 'Invalid credentials');
                return;
            }
        }

        logger.error('Unexpected login error', error instanceof Error ? error : undefined, { ipAddress: clientIP, userAgent });
        send.internalError(res, 'Internal server error');
        return;
    }
});

// POST /auth/logout
authRouter.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const token = req.cookies?.['auth-token'] ||
            (req.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        if (!token) {
            res.clearCookie('auth-token', { path: '/' });
            send.ok(res, { message: 'Logged out successfully' });
            return;
        }

        let user: any = null;
        let customerId: string | undefined = undefined;

        try {
            const queryBus = serviceContainer.getQueryBus();
            const { ValidateSessionQuery: VSQ } = await import('@iotpilot/core/user/application/queries/validate-session/validate-session.query');
            const validateSessionQuery = VSQ.create(token);
            const sessionResult = await queryBus.execute(validateSessionQuery);

            if (sessionResult) {
                user = {
                    id: sessionResult.user.id,
                    email: sessionResult.user.email,
                    customerId: sessionResult.user.customerId,
                };
                customerId = sessionResult.user.customerId;
            }
        } catch {
            // Continue with logout even if session validation fails
        }

        const tenantContext = customerId
            ? TenantContextImpl.create(CustomerId.create(customerId))
            : TenantContextImpl.createSuperAdmin();

        const { LogoutUserCommand } = await import('@iotpilot/core/user/application/commands/logout-user/logout-user.command');

        const logoutCommand = LogoutUserCommand.create(
            user?.id || 'unknown-user',
            token,
            customerId,
            tenantContext
        );

        await commandBus.execute(logoutCommand);

        res.clearCookie('auth-token', { path: '/' });
        send.ok(res, { message: 'Logged out successfully' });
        return;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('Session not found')) {
                res.clearCookie('auth-token', { path: '/' });
                send.ok(res, { message: 'Logged out successfully' });
                return;
            }
        }

        send.internalError(res, 'Internal server error');
        return;
    }
});

// GET /auth/me
authRouter.get('/me', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const { GetCurrentUserQuery } = await import('@iotpilot/core/user/application/queries/get-current-user/get-current-user.query');

        const getCurrentUserQuery = req.user?.customerId
            ? GetCurrentUserQuery.createForTenant(req.user.id, req.user.customerId)
            : GetCurrentUserQuery.createSuperAdmin(req.user!.id);

        const user = await queryBus.execute(getCurrentUserQuery);

        if (!user) {
            send.notFound(res, 'User not found');
            return;
        }

        const userId = user.getId().getValue();
        const customerId = user.getCustomerId()?.getValue() || null;

        const prismaClient = serviceContainer.getPrismaClient().getClient();
        const [deviceCount, alertCount] = await Promise.all([
            prismaClient.device.count({
                where: customerId ? { customerId, deletedAt: null } : { userId, deletedAt: null },
            }),
            prismaClient.alert.count({
                where: {
                    ...(customerId ? { customerId } : {}),
                    resolved: false,
                },
            }),
        ]);

        const userData = {
            id: user.publicId,
            email: user.getEmail().getValue(),
            username: user.getUsername(),
            role: user.getRole().getValue(),
            customerId,
            createdAt: user.getCreatedAt(),
            _count: {
                devices: deviceCount,
                alerts: alertCount,
            },
        };

        send.ok(res, { user: userData });
        return;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                send.notFound(res, 'User not found');
                return;
            }
            if (error.message.includes('Tenant access violation')) {
                send.forbidden(res, 'Access denied');
                return;
            }
        }

        send.internalError(res, 'Internal server error');
        return;
    }
});

// POST /auth/register
authRouter.post('/register', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();
        const queryBus = serviceContainer.getQueryBus();

        const body = req.body;
        const parsed = registrationSchema.parse(body);
        const { email, username, password: passwordValue } = parsed;
        const password: string = passwordValue as string;

        if (email.endsWith('@iotpilot.system')) {
            send.badRequest(res, 'Invalid email domain');
            return;
        }

        const emailDomain = email.split('@')[1];

        const { GetCustomerByDomainQuery } = await import('@iotpilot/core/customer/application/queries/get-customer-by-domain/get-customer-by-domain.query');
        const { CreateCustomerCommand } = await import('@iotpilot/core/customer/application/commands/create-customer/create-customer.command');
        const { RegisterUserCommand } = await import('@iotpilot/core/user/application/commands/register-user/register-user.command');

        const adminContext = TenantContextImpl.createSuperAdmin();

        let customerId: string;
        let isNewCompany = false;

        try {
            const getCustomerQuery = GetCustomerByDomainQuery.create(emailDomain, adminContext);
            const existingCustomer = await queryBus.execute(getCustomerQuery);
            customerId = existingCustomer.id;
        } catch {
            isNewCompany = true;

            const slug = emailDomain.split('.')[0];
            const customerName = `${slug.charAt(0).toUpperCase() + slug.slice(1)} Organization`;

            const createCustomerCommand = CreateCustomerCommand.create(
                customerName,
                adminContext,
                'New Customer',
                emailDomain,
            );

            const newCustomer = await commandBus.execute<typeof createCustomerCommand, { getId(): { getValue(): string } }>(createCustomerCommand);
            customerId = newCustomer.getId().getValue();
        }

        let userRole = 'USER';

        if (isNewCompany) {
            userRole = 'ADMIN';
        } else {
            const prismaService = serviceContainer.getPrismaClient();
            try {
                const existingUserCount = await prismaService.getClient().user.count({
                    where: { customerId, deletedAt: null },
                });
                if (existingUserCount === 0) {
                    userRole = 'ADMIN';
                }
            } catch {
                userRole = 'USER';
            }
        }

        const tenantContext = TenantContextImpl.createCustomerAdmin(CustomerId.create(customerId));

        const registerUserCommand = new RegisterUserCommand(
            tenantContext,
            email,
            password,
            username,
            '',
            undefined,
            userRole
        );

        const userEntity = await commandBus.execute<typeof registerUserCommand, { getId(): { getValue(): string }; publicId?: string }>(registerUserCommand);

        const isFirstUser = isNewCompany || userRole === 'ADMIN';
        if (!isFirstUser) {
            await serviceContainer.getPrismaClient().getClient().user.update({
                where: { id: userEntity.getId().getValue() },
                data: { status: 'PENDING' },
            });
        }

        const responseMessage = isFirstUser
            ? 'Account created successfully. You can now log in.'
            : 'Registration submitted. An administrator will review your account.';

        send.created(res, {
            message: responseMessage,
            user: {
                id: userEntity.publicId || userEntity.getId().getValue(),
                email,
                username,
                role: userRole,
                status: isFirstUser ? 'ACTIVE' : 'PENDING',
                customerId,
            },
            isNewCompany,
            requiresApproval: !isFirstUser,
        });
        return;

    } catch (error) {
        if (error instanceof z.ZodError) {
            send.badRequest(res, 'Invalid input', error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message,
            })));
            return;
        }

        if (error instanceof Error) {
            if (error.message.includes('already exists') || error.message.includes('User with this email already exists')) {
                res.status(409).json({ success: false, error: error.message, code: 'CONFLICT', timestamp: isoTimestamp() });
                return;
            }
            if (error.message.includes('validation') || error.message.includes('required')) {
                send.badRequest(res, error.message);
                return;
            }
            if (error.message.includes('Password')) {
                send.badRequest(res, error.message);
                return;
            }
        }

        send.internalError(res, 'Internal server error');
        return;
    }
});

// POST /auth/refresh
authRouter.post('/refresh', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('AUTH REFRESH: Starting token refresh with DDD architecture');
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        let bodyParsed: any = {};
        try { bodyParsed = req.body || {}; } catch { /* noop */ }
        const { refreshToken: bodyRefreshToken, remember } = refreshSchema.parse(bodyParsed);

        const refreshToken = bodyRefreshToken ||
            req.cookies?.['auth-token'] ||
            (req.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        if (!refreshToken) {
            if (process.env.NODE_ENV === 'development') {
                console.log('AUTH REFRESH: No refresh token provided');
            }
            send.unauthorized(res, 'No refresh token provided');
            return;
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('AUTH REFRESH: Refreshing session token');
        }

        const tenantContext = TenantContextImpl.createSuperAdmin();

        const refreshSessionCommand = RefreshSessionCommand.create(
            refreshToken,
            undefined,
            tenantContext
        );

        const refreshResult: RefreshSessionResult = await commandBus.execute(refreshSessionCommand);

        if (process.env.NODE_ENV === 'development') {
            console.log('AUTH REFRESH: Token refreshed successfully:', {
                userId: refreshResult.user.id,
                email: refreshResult.user.email,
                role: refreshResult.user.role,
                customerId: refreshResult.user.customerId,
            });
        }

        const isHttps = (req.headers['x-forwarded-proto'] as string | undefined) === 'https' || req.protocol === 'https';
        res.cookie('auth-token', refreshResult.token, {
            httpOnly: true,
            secure: isHttps,
            sameSite: 'lax',
            maxAge: (remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60) * 1000,
            path: '/',
        });

        send.ok(res, {
            message: 'Token refreshed successfully',
            user: {
                id: refreshResult.user.id,
                email: refreshResult.user.email,
                username: refreshResult.user.username,
                role: refreshResult.user.role,
                customerId: refreshResult.user.customerId,
            },
            token: refreshResult.token,
            refreshed: true,
        });
        return;

    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('AUTH REFRESH: Failed to refresh token with DDD:', error);
        }

        if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as any).errors)) {
            send.badRequest(res, 'Invalid refresh request', (error as any).errors);
            return;
        }

        if (error instanceof Error) {
            if (error.message.includes('Invalid or expired refresh token')) {
                res.clearCookie('auth-token', { path: '/' });
                send.unauthorized(res, 'Invalid or expired refresh token');
                return;
            }
            if (error.message.includes('Session not found') || error.message.includes('Session expired')) {
                res.clearCookie('auth-token', { path: '/' });
                send.unauthorized(res, 'Session expired or not found');
                return;
            }
            if (error.message.includes('User not found')) {
                send.notFound(res, 'User associated with session not found');
                return;
            }
        }

        send.internalError(res, 'Failed to refresh token');
        return;
    }
});

// GET /auth/session
authRouter.get('/session', async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('AUTH SESSION: Starting session validation with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const token = req.cookies?.['auth-token'] ||
            (req.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        if (!token) {
            if (process.env.NODE_ENV === 'development') {
                console.log('AUTH SESSION: No token provided');
            }
            send.unauthorized(res, 'No authentication token provided');
            return;
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('AUTH SESSION: Validating session token');
        }

        const validateSessionQuery = ValidateSessionQuery.create(token);
        const sessionResult: SessionValidationResult = await queryBus.execute(validateSessionQuery);

        if (!sessionResult.valid) {
            console.log('AUTH SESSION: Session validation failed');
            send.unauthorized(res, 'Invalid or expired session');
            return;
        }

        console.log('AUTH SESSION: Session validated successfully:', {
            userId: sessionResult.user?.id,
            email: sessionResult.user?.email,
            role: sessionResult.user?.role,
            customerId: sessionResult.user?.customerId,
        });

        const sessionData = {
            valid: true,
            user: {
                id: sessionResult.user!.id,
                email: sessionResult.user!.email,
                username: sessionResult.user!.username,
                role: sessionResult.user!.role,
                customerId: sessionResult.user!.customerId,
            },
            session: {
                id: sessionResult.session!.id,
                expiresAt: sessionResult.session!.expiresAt,
            },
        };

        send.ok(res, sessionData);
        return;

    } catch (error) {
        console.error('AUTH SESSION: Failed to validate session with DDD:', error);

        if (error instanceof Error) {
            if (error.message.includes('Token is required')) {
                send.unauthorized(res, 'No authentication token provided');
                return;
            }
            if (error.message.includes('Session not found') || error.message.includes('expired')) {
                send.unauthorized(res, 'Invalid or expired session');
                return;
            }
        }

        send.internalError(res, 'Failed to validate session');
        return;
    }
});

// GET /auth/sessions — list active sessions for the current user
authRouter.get('/sessions', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const currentToken = req.cookies?.['auth-token'] ||
            (req.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        const rows = await prisma.getClient().session.findMany({
            where: {
                userId,
                deletedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true, createdAt: true, expiresAt: true, token: true },
        });

        const sessions = rows.map((r: { id: string; createdAt: Date; expiresAt: Date; token: string }) => ({
            id: r.id,
            createdAt: r.createdAt.toISOString(),
            expiresAt: r.expiresAt.toISOString(),
            isCurrent: currentToken ? r.token === currentToken : false,
        }));

        send.ok(res, sessions);
        return;
    } catch (error) {
        console.error('Error listing sessions:', error);
        send.internalError(res, 'Failed to list sessions');
        return;
    }
});

// DELETE /auth/sessions — revoke all sessions except the current one
authRouter.delete('/sessions', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const currentToken = req.cookies?.['auth-token'] ||
            (req.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        let currentSessionId: string | null = null;
        if (currentToken) {
            const current = await prisma.getClient().session.findUnique({
                where: { token: currentToken },
                select: { id: true },
            });
            currentSessionId = current?.id ?? null;
        }

        const result = await prisma.getClient().session.updateMany({
            where: {
                userId,
                deletedAt: null,
                ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
            },
            data: { deletedAt: new Date() },
        });

        send.ok(res, { revokedCount: result.count });
        return;
    } catch (error) {
        console.error('Error revoking sessions:', error);
        send.internalError(res, 'Failed to revoke sessions');
        return;
    }
});

// DELETE /auth/sessions/:id — revoke a specific session
authRouter.delete('/sessions/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessionId = req.params.id;
        const userId = req.user!.id;

        const session = await prisma.getClient().session.findFirst({
            where: { id: sessionId, userId, deletedAt: null },
            select: { id: true, token: true },
        });

        if (!session) {
            send.notFound(res, 'Session not found');
            return;
        }

        const currentToken = req.cookies?.['auth-token'] ||
            (req.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        await prisma.getClient().session.update({
            where: { id: sessionId },
            data: { deletedAt: new Date() },
        });

        send.ok(res, {
            revoked: true,
            wasCurrentSession: currentToken === session.token,
        });
        return;
    } catch (error) {
        console.error('Error revoking session:', error);
        send.internalError(res, 'Failed to revoke session');
        return;
    }
});

// PUT /auth/password — change the current user's password
authRouter.put('/password', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const body = req.body;
        const parsed = changePasswordSchema.safeParse(body);

        if (!parsed.success) {
            send.badRequest(res, 'Invalid input', parsed.error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
            })));
            return;
        }

        const { currentPassword, newPassword } = parsed.data;
        const userId = req.user!.id;

        const userRow = await prisma.getClient().user.findUnique({
            where: { id: userId },
            select: { id: true, password: true },
        });

        if (!userRow) {
            send.notFound(res, 'User not found');
            return;
        }

        const hasher = new BcryptPasswordHasher();
        const isValid = await hasher.verify(
            Password.create(currentPassword),
            userRow.password || ''
        );

        if (!isValid) {
            send.badRequest(res, 'Current password is incorrect');
            return;
        }

        const newHash = await hasher.hash(Password.create(newPassword));

        await prisma.getClient().user.update({
            where: { id: userId },
            data: { password: newHash, updatedAt: new Date() },
        });

        send.ok(res, { message: 'Password updated successfully' });
        return;

    } catch (error) {
        console.error('Error changing password:', error);
        send.internalError(res, 'Failed to change password');
        return;
    }
});

// POST /auth/api-keys — create a new API key
authRouter.post('/api-keys', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    let correlationId: string | undefined;

    try {
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        correlationId = (req.headers['x-correlation-id'] as string | undefined) || crypto.randomUUID();

        const body = req.body;
        const { name, expiresAt } = createApiKeySchema.parse(body);

        const user = req.user!;

        const tenantContext = user.customerId
            ? TenantContextImpl.create(CustomerId.fromString(user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const createApiKeyCommand = CreateApiKeyCommand.create(
            user.id,
            user.customerId || '',
            name,
            tenantContext,
            expiresAt ? new Date(expiresAt) : undefined
        );

        await commandBus.execute(createApiKeyCommand);

        apiKeysLogger.info('API key created successfully via CQRS CommandBus', {
            event: 'api_key_created',
            correlationId,
            userId: user.id,
            customerId: user.customerId ?? undefined,
            name,
            hasExpiration: !!expiresAt,
            commandExecuted: 'CreateApiKeyCommand',
            method: 'POST',
        });

        send.created(res, {
            message: 'API key created successfully. Use GET /api/auth/api-keys to view your keys.',
            redirectTo: '/dashboard/api-keys',
        });
        return;

    } catch (error: unknown) {
        const safeError = getSafeErrorInfo(error);

        if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as any).errors)) {
            const validationErrors = (error as any).errors.map((issue: { path: (string | number)[]; message: string; code: string }) => ({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code,
            }));

            apiKeysLogger.warn('API key creation input validation failed', {
                event: 'api_key_creation_validation_error',
                correlationId,
                userId: req.user?.id,
                customerId: req.user?.customerId ?? undefined,
                errorCount: validationErrors.length,
                firstError: validationErrors[0]?.message,
                method: 'POST',
            });

            send.badRequest(res, 'Invalid input', validationErrors);
            return;
        }

        apiKeysLogger.error('API key creation failed via CommandBus', {
            event: 'api_key_creation_command_error',
            correlationId,
            userId: req.user?.id,
            customerId: req.user?.customerId ?? undefined,
            errorMessage: safeError.message,
            errorType: safeError.type,
            hasStackTrace: !!safeError.stack,
            method: 'POST',
            command: 'CreateApiKeyCommand',
        });

        const errorMessage = safeError.message || 'Failed to create API key';
        if (safeError.type.includes('Domain') || safeError.type.includes('Validation')) {
            send.badRequest(res, errorMessage);
            return;
        } else if (safeError.type.includes('Unauthorized') || safeError.type.includes('Forbidden')) {
            send.forbidden(res, errorMessage);
            return;
        } else if (safeError.type.includes('NotFound')) {
            send.notFound(res, errorMessage);
            return;
        }

        send.internalError(res, errorMessage);
        return;
    }
});

// GET /auth/api-keys — list API keys
authRouter.get('/api-keys', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    let correlationId: string | undefined;

    try {
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        correlationId = (req.headers['x-correlation-id'] as string | undefined) || crypto.randomUUID();

        const user = req.user!;

        const tenantContext = user.customerId
            ? TenantContextImpl.create(CustomerId.fromString(user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const listApiKeysQuery = ListApiKeysQuery.create(user.id, tenantContext);

        const queryResult = await queryBus.execute(listApiKeysQuery);

        const apiKeys = Array.isArray(queryResult?.apiKeys) ? queryResult.apiKeys : [];
        const totalCount = queryResult?.totalCount || apiKeys.length;

        apiKeysLogger.info('API keys retrieved via QueryBus', {
            event: 'api_keys_retrieved',
            correlationId,
            userId: user.id,
            customerId: user.customerId ?? undefined,
            count: apiKeys.length,
            totalCount,
            queryExecuted: 'ListApiKeysQuery',
            method: 'GET',
        });

        interface ApiKeyRecord {
            id: string;
            name: string;
            key?: string;
            expiresAt?: Date | string | null;
            createdAt?: Date | string;
            deletedAt?: Date | string | null;
            lastUsedAt?: Date | string | null;
        }

        const maskedKeys = (apiKeys as ApiKeyRecord[]).map(key => ({
            id: key.id,
            name: key.name,
            maskedKey: key.key ? `****${key.key.slice(-4)}` : '****0000',
            expiresAt: key.expiresAt,
            createdAt: key.createdAt,
            isActive: !key.deletedAt && (!key.expiresAt || new Date(key.expiresAt) > new Date()),
            lastUsedAt: key.lastUsedAt,
        }));

        const limit = 50;
        const offset = 0;
        const pagination = Pagination.fromOffset(offset, limit, totalCount);

        send.ok(res, maskedKeys, { pagination });
        return;

    } catch (error: unknown) {
        const safeError = getSafeErrorInfo(error);

        apiKeysLogger.error('API keys query failed', {
            event: 'api_keys_query_failed',
            correlationId,
            userId: req.user?.id,
            customerId: req.user?.customerId ?? undefined,
            errorMessage: safeError.message,
            errorType: safeError.type,
            hasStackTrace: !!safeError.stack,
            method: 'GET',
            query: 'ListApiKeysQuery',
        });

        send.internalError(res, 'Failed to retrieve API keys');
        return;
    }
});

// DELETE /auth/api-keys — delete an API key by ?id= query param
authRouter.delete('/api-keys', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    let keyId: string | undefined;
    let correlationId: string | undefined;

    try {
        const serviceContainer = ServiceContainer.getInstance();

        correlationId = (req.headers['x-correlation-id'] as string | undefined) || crypto.randomUUID();

        const user = req.user!;

        keyId = req.query['id'] as string | undefined;

        if (!keyId) {
            apiKeysLogger.warn('API key deletion missing ID', {
                event: 'api_key_deletion_missing_id',
                correlationId,
                userId: user.id,
                customerId: user.customerId ?? undefined,
                method: 'DELETE',
            });
            send.badRequest(res, 'API key ID is required');
            return;
        }

        const prismaService = serviceContainer.getPrismaClient();
        const where: Prisma.ApiKeyWhereInput = {
            id: keyId,
            userId: user.id,
            deletedAt: null,
        };
        if (user.customerId) {
            where.customerId = user.customerId;
        }

        const updated = await prismaService.getClient().apiKey.updateMany({
            where,
            data: { deletedAt: new Date() },
        });

        if (updated.count === 0) {
            send.notFound(res, 'API key not found or already deleted');
            return;
        }

        apiKeysLogger.info('API key soft-deleted successfully', {
            event: 'api_key_deleted',
            correlationId,
            keyId,
            userId: user.id,
            customerId: user.customerId ?? undefined,
            method: 'DELETE',
        });

        send.ok(res, {
            message: 'API key deleted successfully',
            keyId,
            deletedAt: isoTimestamp(),
        });
        return;

    } catch (error: unknown) {
        const safeError = getSafeErrorInfo(error);

        apiKeysLogger.error('API key deletion failed', {
            event: 'api_key_deletion_error',
            correlationId,
            keyId,
            userId: req.user?.id,
            customerId: req.user?.customerId ?? undefined,
            errorMessage: safeError.message,
            errorType: safeError.type,
            hasStackTrace: !!safeError.stack,
            method: 'DELETE',
        });

        send.internalError(res, 'Failed to delete API key');
        return;
    }
});

// POST /auth/verify-2fa
authRouter.post('/verify-2fa', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const body = req.body;
        const { userId, code, remember } = verifySchema.parse(body);

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const user = await serviceContainer.getPrismaClient().getClient().user.findUnique({
            where: { id: userId },
            select: { customerId: true },
        });

        const { VerifyTwoFactorCommand } = await import(
            '@iotpilot/core/user/application/commands/verify-two-factor/verify-two-factor.command'
        );

        const result = await commandBus.execute(
            VerifyTwoFactorCommand.create(userId, code, user?.customerId || undefined)
        ) as { token: string; user: Record<string, unknown> };

        const maxAge = (remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60) * 1000;

        res.cookie('auth-token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge,
        });

        send.ok(res, result);
        return;

    } catch (error) {
        if (error instanceof z.ZodError) {
            send.badRequest(res, 'Invalid input');
            return;
        }
        if (error instanceof Error && error.message.includes('Invalid or expired')) {
            send.unauthorized(res, 'Invalid or expired verification code');
            return;
        }
        console.error('[verify-2fa] Error:', error);
        send.internalError(res, 'Verification failed');
        return;
    }
});
