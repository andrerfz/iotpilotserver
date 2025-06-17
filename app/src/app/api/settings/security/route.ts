import {NextResponse} from 'next/server';
import {z} from 'zod';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {getUserPreferences} from '@/lib/user-preferences';

// Validation schema for security settings
const securitySettingsSchema = z.object({
    twoFactorAuth: z.enum(['true', 'false']),
    sessionTimeout: z.string().regex(/^\d+$/), // numeric string
    loginNotifications: z.enum(['true', 'false'])
});

// GET /api/settings/security - Get security settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
        }

        // Get security preferences with defaults
        const preferences = await getUserPreferences(user.id, 'SECURITY');

        return NextResponse.json(preferences);
    } catch (error) {
        console.error('Failed to fetch security settings:', error);
        return NextResponse.json(
            {error: 'Failed to fetch security settings'},
            {status: 500}
        );
    }
});

// PUT /api/settings/security - Update security settings
export const PUT = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = securitySettingsSchema.parse(body);

        // Additional validation for sessionTimeout
        const sessionTimeout = parseInt(validatedData.sessionTimeout);
        if (isNaN(sessionTimeout) || sessionTimeout < 5 || sessionTimeout > 1440) {
            return NextResponse.json(
                {error: 'Session timeout must be between 5 and 1440 minutes'},
                {status: 400}
            );
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

        return NextResponse.json({
            message: 'Security settings updated successfully',
            settings: validatedData
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid input',
                    details: error.errors.map(err => ({
                        path: err.path.join('.'),
                        message: err.message
                    }))
                },
                {status: 400}
            );
        }

        console.error('Failed to update security settings:', error);
        return NextResponse.json(
            {error: 'Failed to update security settings'},
            {status: 500}
        );
    }
});
