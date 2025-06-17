import {NextResponse} from 'next/server';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import os from 'os';

// Handler for getting system health metrics
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        // Get current user context
        const currentUser = request.user;
        if (!currentUser) {
            return NextResponse.json({error: 'Authentication required'}, {status: 401});
        }

        // Only ADMIN or SUPERADMIN can access system health
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
            return NextResponse.json({error: 'Insufficient permissions'}, {status: 403});
        }

        // Get system metrics
        const systemMetrics = {
            cpu: {
                cores: os.cpus().length,
                model: os.cpus()[0].model,
                loadAvg: os.loadavg(),
                utilization: Math.round((1 - os.freemem() / os.totalmem()) * 100)
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                usedPercentage: Math.round((1 - os.freemem() / os.totalmem()) * 100)
            },
            uptime: os.uptime(),
            platform: os.platform(),
            hostname: os.hostname(),
            timestamp: new Date()
        };

        // Get database metrics
        const dbMetrics = await getDatabaseMetrics(currentUser.role === 'SUPERADMIN');

        // Get application metrics
        const appMetrics = await getApplicationMetrics(currentUser.role === 'SUPERADMIN');

        return NextResponse.json({
            system: systemMetrics,
            database: dbMetrics,
            application: appMetrics
        });
    } catch (error) {
        console.error('System health error:', error);
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );
    }
}, {requiredRole: 'ADMIN'}); // Only ADMIN or higher can access this endpoint

// Helper function to get database metrics
async function getDatabaseMetrics(isSuperAdmin: boolean) {
    try {
        // Get database statistics
        const [
            userCount,
            deviceCount,
            alertCount,
            customerCount
        ] = await Promise.all([
            tenantPrisma.client.user.count(),
            tenantPrisma.client.device.count(),
            tenantPrisma.client.alert.count(),
            isSuperAdmin ? (tenantPrisma.client as any).customer?.count() ?? Promise.resolve(0) : Promise.resolve(1)
        ]);

        // Get recent database activity
        const recentActivity = await tenantPrisma.client.device.findMany({
            take: 5,
            orderBy: {updatedAt: 'desc'},
            select: {
                id: true,
                hostname: true,
                updatedAt: true
            }
        });

        return {
            counts: {
                users: userCount,
                devices: deviceCount,
                alerts: alertCount,
                customers: customerCount
            },
            recentActivity,
            status: 'healthy'
        };
    } catch (error) {
        console.error('Database metrics error:', error);
        return {
            status: 'error',
            error: 'Failed to fetch database metrics'
        };
    }
}

// Helper function to get application metrics
async function getApplicationMetrics(isSuperAdmin: boolean) {
    try {
        // In a real implementation, you would gather metrics from your application
        // For now, we'll return some placeholder data
        return {
            status: 'healthy',
            version: '1.0.0',
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
            features: {
                multiTenant: true,
                advancedMetrics: true,
                tailscale: true
            },
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };
    } catch (error) {
        console.error('Application metrics error:', error);
        return {
            status: 'error',
            error: 'Failed to fetch application metrics'
        };
    }
}
