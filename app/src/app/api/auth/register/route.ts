import {NextRequest} from 'next/server';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {rateLimitConfigs, withRateLimit} from '@/lib/shared/infrastructure/middleware/rate-limiting.middleware';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod'; // Keep for complex regex validation

// Registration schema
// Note: Complex regex validation with multiple patterns - using fromZodSchema for now
const v = validator();
const complexPasswordSchema = z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/);
const registrationSchema = v.object({
    email: v.string({ email: true }),
    username: v.string({ min: 3, max: 50 }),
    password: (v as any).fromZodSchema(complexPasswordSchema)
});

async function registerHandler(request: NextRequest) {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();
        const queryBus = serviceContainer.getQueryBus();

        const body = await request.json();
        const parsed = registrationSchema.parse(body);
        const { email, username, password: passwordValue } = parsed;
        
        // Type assertion for password from fromZodSchema (TypeScript can't infer the type)
        const password: string = passwordValue as string;

        // Prevent SUPERADMIN creation via API
        if (email.endsWith('@iotpilot.system')) {
            return ApiResponse.badRequest('Invalid email domain');
        }

        // Check if company exists by email domain
        const emailDomain = email.split('@')[1];
        
        // Import queries and commands here to avoid circular imports
        const { GetCustomerByDomainQuery } = await import('@/lib/customer/application/queries/get-customer-by-domain/get-customer-by-domain.query');
        const { CreateCustomerCommand } = await import('@/lib/customer/application/commands/create-customer/create-customer.command');
        const { RegisterUserCommand } = await import('@/lib/user/application/commands/register-user/register-user.command');

        // Use SUPERADMIN context for customer bootstrap operations (no SUPERADMIN users are created here)
        const adminContext = TenantContextImpl.createSuperAdmin();

        let customerId: string;
        let isNewCompany = false;

        try {
            // Try to find existing customer by domain
            const getCustomerQuery = GetCustomerByDomainQuery.create(emailDomain, adminContext);
            const existingCustomer = await queryBus.execute(getCustomerQuery);
            customerId = existingCustomer.getId().getValue();
        } catch (error) {
            // Customer doesn't exist, create new one
            isNewCompany = true;
            
            // Generate a slug from the email domain
            const slug = emailDomain.split('.')[0];
            const customerName = `${slug.charAt(0).toUpperCase() + slug.slice(1)} Organization`;
            
            // Generate a new customer ID
            customerId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create new customer
            const createCustomerCommand = CreateCustomerCommand.create(
                customerName,
                adminContext,
                'New Customer',
                emailDomain,
            );

            await commandBus.execute(createCustomerCommand);
        }

        // Determine user role based on whether this is the first user for the customer
        // First user for a customer is auto-approved as ADMIN
        // Subsequent users start as USER with PENDING status
        let userRole = 'USER';
        
        if (isNewCompany) {
            // New company, first user is always ADMIN
            userRole = 'ADMIN';
        } else {
            // Existing company, check if this is the first user
            // Use PrismaService to check for existing users in this customer
            const { PrismaService } = await import('@/lib/shared/infrastructure/database/prisma.service');
            const prismaService = new PrismaService();
            
            try {
                const existingUserCount = await prismaService.getClient().user.count({
                    where: {
                        customerId: customerId,
                        deletedAt: null
                    }
                });
                
                // If no existing users, this is the first user for this customer
                if (existingUserCount === 0) {
                    userRole = 'ADMIN';
                }
            } catch (error) {
                // If we can't check existing users, default to USER role
                userRole = 'USER';
            }
        }

        // Create tenant context for user registration within the customer
        const tenantContext = TenantContextImpl.createCustomerAdmin(CustomerId.create(customerId));

        // Create user using DDD command (map username -> firstName for now)
        const registerUserCommand = new RegisterUserCommand(
            tenantContext,
            email,
            password,
            username,
            '',
            undefined,
            userRole
        );
        const result = await commandBus.execute(registerUserCommand);

        // For existing companies, notify admins about new user
        if (!isNewCompany) {
            // TODO: Implement email notifications
        }

        // Return appropriate response
        const responseMessage = isNewCompany
            ? 'Account created successfully. You can now log in.'
            : 'Registration completed. You can now log in.';

        return ApiResponse.created({
            message: responseMessage,
            user: {
                id: result, // Assuming the result of dispatch is the userId
                email,
                username,
                role: userRole,
                customerId
            },
            isNewCompany
        });

    } catch (error) {
        
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid input', error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            })));
        }

        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('already exists') || error.message.includes('User with this email already exists')) {
                return ApiResponse.conflict(error.message);
            }
            if (error.message.includes('validation') || error.message.includes('required')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Internal server error', error instanceof Error ? error.message : 'Unknown error');
    }
}

// Export with rate limiting (10 registration attempts per 15 minutes)
export const POST = withRateLimit(registerHandler, rateLimitConfigs.auth);
