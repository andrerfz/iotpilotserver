import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/shared/infrastructure/middleware/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {getUserPreferences} from '@/lib/user-preferences';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod'; // Keep for regex validation

// Dynamic route: reads auth from cookies
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Validation schema for security settings
// Note: Regex validation - using fromZodSchema for now
const v = validator();
const regexStringSchema = z.string().regex(/^\d+$/);
const securitySettingsSchema = v.object({
    twoFactorAuth: v.enum(['true', 'false'] as const),
    sessionTimeout: (v as any).fromZodSchema(regexStringSchema), // numeric string
    loginNotifications: v.enum(['true', 'false'] as const)
});

// GET /api/settings/security - Get security settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return ApiResponse.unauthorized('Authentication required');
        }

        // Get security preferences with defaults
        const preferences = await getUserPreferences(user.id, 'SECURITY');

        return ApiResponse.ok(preferences);
    } catch (error) {
        console.error('Failed to fetch security settings:', error);
        return ApiResponse.internalError('Failed to fetch security settings');
    }
});

// PUT /api/settings/security - Update security settings
export const PUT = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return ApiResponse.unauthorized('Authentication required');
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = securitySettingsSchema.parse(body);

        // Additional validation for sessionTimeout
        // Type assertion for sessionTimeout from fromZodSchema (TypeScript can't infer the type)
        const sessionTimeout = parseInt(validatedData.sessionTimeout as string);
        if (isNaN(sessionTimeout) || sessionTimeout < 5 || sessionTimeout > 1440) {
            return ApiResponse.badRequest('Session timeout must be between 5 and 1440 minutes');
        }

        // Update each preference
        const updatePromises = Object.entries(validatedData).map(([key, value]) =>
            tenantPrisma.client.userPreference.upsert({
                where: {
                    userId_category_key: {
                        userId: user.id,
                        category: 'SECURITY',
                        key
                    }
                },
                update: {value: String(value)},
                create: {
                    userId: user.id,
                    category: 'SECURITY',
                    key,
                    value: String(value)
                }
            })
        );

        await Promise.all(updatePromises);

        // If two-factor auth is enabled, we might need additional setup
        if (validatedData.twoFactorAuth === 'true') {
            // In a real implementation, we would generate and store 2FA secrets
            // For now, we'll just log it
            console.log(`Two-factor authentication enabled for user ${user.id}`);
        }

        return ApiResponse.ok({
            message: 'Security settings updated successfully',
            settings: validatedData
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid input', error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            })));
        }

        console.error('Failed to update security settings:', error);
        return ApiResponse.internalError('Failed to update security settings');
    }
});
