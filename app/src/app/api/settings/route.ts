import {NextResponse} from 'next/server';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';

// GET /api/settings - Get all user settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
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
        const groupedPreferences = preferences.reduce((acc, pref) => {
            if (!acc[pref.category]) {
                acc[pref.category] = {};
            }
            acc[pref.category][pref.key] = pref.value;
            return acc;
        }, {} as Record<string, Record<string, string>>);

        return NextResponse.json(groupedPreferences);
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return NextResponse.json(
            {error: 'Failed to fetch settings'},
            {status: 500}
        );
    }
});
