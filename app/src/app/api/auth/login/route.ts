import {NextRequest} from 'next/server';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {rateLimitConfigs, withRateLimit} from '@/lib/shared/infrastructure/middleware/rate-limiting.middleware';
import {logger} from '@/lib/shared/infrastructure/logging/logger.service';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// LOGIN schema - only email, password, remember
const v = validator();
const loginSchema = v.object({
    email: v.string({ email: true }),
    password: v.string({ min: 1 }),
    remember: v.optional(v.boolean())
});

async function loginHandler(request: NextRequest) {
    const clientIP = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
        logger.info('Authentication attempt', {
            email: 'pending',
            ipAddress: clientIP,
            userAgent: userAgent,
            endpoint: 'login'
        });

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();
        const queryBus = serviceContainer.getQueryBus();
        const userRepository = serviceContainer.getUserRepository();

        const body = await request.json();
        const { email, password, remember } = loginSchema.parse(body);

        logger.debug('Login validation passed', {
            email,
            remember: !!remember,
            ipAddress: clientIP
        });


        // Create tenant context (authentication doesn't require specific tenant)
        const tenantContext = TenantContextImpl.createSuperAdmin();

        // Import AuthenticateUser command here to avoid circular imports
        const { AuthenticateUserCommand } = await import('@/lib/user/application/commands/authenticate-user/authenticate-user.command');
        const { GetCustomerByDomainQuery } = await import('@/lib/customer/application/queries/get-customer-by-domain/get-customer-by-domain.query');
        const { Email } = await import('@/lib/user/domain/value-objects/email.vo');

        // Define the authentication result interface locally to avoid import issues
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
            // Use repository pattern instead of direct PrismaClient
            const emailVO = Email.fromString(email);
            const existingUser = await userRepository.findByEmail(emailVO, tenantContext);

            if (!existingUser) {
                logger.warn('User not found', { email, ipAddress: clientIP });
                return ApiResponse.unauthorized('Invalid credentials');
            }

            // If user is SUPERADMIN (no customerId), authenticate as superadmin
            if (existingUser.isSuperAdmin()) {
                logger.debug('Authenticating SUPERADMIN user', { email });
                authenticateCommand = AuthenticateUserCommand.createSuperAdmin(email, password);
            } else {
                // For tenant users, extract customer ID from the user record or email domain
                let customerId: string | null = existingUser.getCustomerId()?.getValue() || null;

                if (!customerId) {
                    // Try to find customer by email domain as fallback
                    const emailDomain = email.split('@')[1];
                    const getCustomerQuery = GetCustomerByDomainQuery.create(emailDomain, tenantContext);
                    const customerResult = await queryBus.execute(getCustomerQuery);

                    if (!customerResult) {
                        logger.warn('Customer not found for domain', { emailDomain, ipAddress: clientIP });
                        return ApiResponse.unauthorized('Invalid credentials');
                    }

                    customerId = customerResult.getId().getValue();
                }

                // At this point, customerId is guaranteed to be a string
                if (!customerId) {
                    logger.warn('Customer ID could not be resolved', { email, ipAddress: clientIP });
                    return ApiResponse.unauthorized('Invalid credentials - no customer found');
                }

                logger.debug('Creating AuthenticateUserCommand for tenant user', {
                    email,
                    customerId
                });
                authenticateCommand = AuthenticateUserCommand.createForTenant(
                    email,
                    password,
                    customerId
                );
            }

            logger.debug('AuthenticateUserCommand created successfully');
        } catch (error) {
            logger.error('Error in authentication setup', error instanceof Error ? error : undefined, {
                ipAddress: clientIP
            });
            if (error instanceof Error && error.message.includes('Password must contain')) {
                return ApiResponse.badRequest('Invalid password format');
            }
            return ApiResponse.unauthorized('Invalid credentials');
        }
        
        logger.debug('Executing authentication command', {
            email,
            commandType: authenticateCommand.constructor.name,
            ipAddress: clientIP
        });

        const authResult = await commandBus.execute<typeof authenticateCommand, AuthenticationResult>(authenticateCommand);

        logger.info('User authenticated successfully', {
            userId: authResult.user.id,
            email: authResult.user.email,
            role: authResult.user.role,
            customerId: authResult.user.customerId || undefined,
            ipAddress: clientIP,
            userAgent: userAgent
        });

        // Log successful login security event
        logger.logLoginAttempt(authResult.user.id, authResult.user.customerId || undefined, clientIP, true, userAgent);

        // Create response
        const response = ApiResponse.ok({
            user: {
                id: authResult.user.id,
                email: authResult.user.email,
                username: authResult.user.username,
                role: authResult.user.role,
                customerId: authResult.user.customerId
            },
            token: authResult.token
        });

        // Set cookie without domain for local development
        response.cookies.set('auth-token', authResult.token, {
            httpOnly: true,
            secure: false, // Set to false for local HTTP
            sameSite: 'lax',
            maxAge: remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60,
            path: '/'
        });

        logger.debug('Login completed successfully', {
            userId: authResult.user.id,
            email: authResult.user.email,
            ipAddress: clientIP
        });

        return response;

    } catch (error) {
        logger.error('Login failed', error instanceof Error ? error : undefined, {
            email: 'parsed_from_body', // We don't want to log the actual email on failure for privacy
            ipAddress: clientIP,
            userAgent: userAgent,
            errorType: error instanceof Error ? error.name : 'Unknown',
            securityEvent: 'LOGIN_FAILURE'
        });

        // Log failed login security event (we don't have userId for failed attempts)
        logger.logLoginAttempt('unknown', undefined, clientIP, false, userAgent);

        if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as any).errors)) {
            logger.warn('Login validation failed', {
                error: 'Invalid input format',
                ipAddress: clientIP
            });
            return ApiResponse.badRequest('Invalid input', (error as any).errors);
        }

        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('Invalid credentials') ||
                error.message.includes('not found') ||
                error.message.includes('Password verification failed')) {
                logger.warn('Invalid credentials attempt', {
                    error: error.message,
                    ipAddress: clientIP,
                    userAgent: userAgent
                });
                return ApiResponse.unauthorized('Invalid credentials');
            }
        }

        logger.error('Unexpected login error', error instanceof Error ? error : undefined, {
            ipAddress: clientIP,
            userAgent: userAgent
        });

        return ApiResponse.internalError('Internal server error');
    }
}

// Export with rate limiting (10 login attempts per 15 minutes)
export const POST = withRateLimit(loginHandler, rateLimitConfigs.auth);