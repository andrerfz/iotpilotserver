// app/src/app/api/devices/[id]/ssh/route.ts
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {
    ExecuteSshCommandCommand
} from '@/lib/device/application/commands/execute-ssh-command/execute-ssh-command.command';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// SSH command schema
const v = validator();
const sshCommandSchema = v.object({
    command: v.string({ min: 1, message: 'Command cannot be empty' }),
    timeout: v.default(v.optional(v.number({ min: 1000, max: 300000 })), 30000) // 1s to 5min
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/devices/:id/ssh - Execute SSH command on device using DDD architecture
export const POST = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 DEVICE SSH: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        // Extract device ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const deviceId = urlParts[urlParts.indexOf('devices') + 1];
        const body = await request.json();
        const { command, timeout } = sshCommandSchema.parse(body);

        console.log('📋 DEVICE SSH: Command execution request:', {
            deviceId,
            command: command.substring(0, 100) + (command.length > 100 ? '...' : ''), // Truncate for logging
            timeout,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Import ExecuteSSHCommand here to avoid circular imports
        // const { ExecuteSSHCommand } = await import('@/lib/device/application/commands/execute-ssh-command/execute-ssh-command.command');

        // Create and execute ExecuteSSHCommand
        const executeSSHCommand = new ExecuteSshCommandCommand(
            deviceId,
            command,
            tenantContext
        );

        const result = await commandBus.execute(executeSSHCommand);
        // Temporarily hardcode the response since result is void
        console.log('✅ DEVICE SSH: Command executed successfully:', {
            deviceId,
            success: true,
            outputLength: 0,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        return ApiResponse.ok({
            success: true,
            output: 'Command executed successfully',
            error: null
        });

    } catch (error) {
        console.error('❌ DEVICE SSH: Failed to execute SSH command:', error);
        
        if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as any).errors)) {
            return ApiResponse.badRequest('Invalid input', (error as any).errors.map((err: { path: (string | number)[]; message: string }) => ({
                path: err.path.join('.'),
                message: err.message
            })));
        }

        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Device not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('timeout')) {
                return ApiResponse.error('Command execution timeout', 408);
            }
            if (error.message.includes('connection') || error.message.includes('SSH')) {
                return ApiResponse.serviceUnavailable('Unable to connect to device');
            }
        }

        return ApiResponse.internalError('Failed to execute SSH command');
    }
}, ServiceContainer.getInstance().getQueryBus());