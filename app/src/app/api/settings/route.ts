import {AuthenticatedRequest, withCustomerContext} from '@/lib/shared/infrastructure/middleware/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// Dynamic route: reads auth from cookies
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET /api/settings - Get all user settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return ApiResponse.unauthorized('Authentication required');
        }

        // Get all user preferences
        const preferences = await tenantPrisma.client.userPreference.findMany({
            where: {userId: user.id},
            orderBy: [
                {category: 'asc'},
                {key: 'asc'}
            ]
        });

        // Group preferences by category
        const groupedPreferences = preferences.reduce((acc: Record<string, Record<string, string>>, pref: { category: string; key: string; value: string }) => {
            if (!acc[pref.category]) {
                acc[pref.category] = {};
            }
            acc[pref.category][pref.key] = pref.value;
            return acc;
        }, {} as Record<string, Record<string, string>>);

        return ApiResponse.ok(groupedPreferences);
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return ApiResponse.internalError('Failed to fetch settings');
    }
});
