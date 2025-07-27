import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {CommandStatus} from '@/lib/device/domain/entities/device-command.entity';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/shared/infrastructure/middleware/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {StructuredLogger} from '@/lib/shared/infrastructure/logging/structured-logger';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod'; // Keep for complex transform

const logger = StructuredLogger.forService('device-commands-api');

// We'll dynamically import the commandQueue at runtime
let commandQueueModule: any = null;

// PrismaCommandStatus type - matches Prisma schema enum
type PrismaCommandStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

/**
 * Maps domain CommandStatus enum to Prisma CommandStatus string literal
 * This keeps the domain enum as the single source of truth
 */
function mapCommandStatusToPrisma(status: CommandStatus): PrismaCommandStatus {
    const statusMap: Record<CommandStatus, PrismaCommandStatus> = {
        [CommandStatus.PENDING]: 'PENDING',
        [CommandStatus.EXECUTING]: 'RUNNING',
        [CommandStatus.RUNNING]: 'RUNNING',
        [CommandStatus.COMPLETED]: 'COMPLETED',
        [CommandStatus.FAILED]: 'FAILED',
        [CommandStatus.TIMEOUT]: 'TIMEOUT'
    };
    return statusMap[status];
}

// Supported command types and their mappings
const SUPPORTED_COMMANDS = {
    RESTART: 'restart',
    SHUTDOWN: 'shutdown',
    UPDATE: 'update',
    CUSTOM: 'custom',
    REBOOT: 'reboot',
    INSTALL: 'install',
    UNINSTALL: 'uninstall',
} as const;

// Validation schema for creating a new command
const v = validator();
const createCommandSchema = v.object({
    command: v.enum(['RESTART', 'SHUTDOWN', 'UPDATE', 'CUSTOM', 'REBOOT', 'INSTALL', 'UNINSTALL', 
                     'restart', 'shutdown', 'update', 'custom', 'reboot', 'install', 'uninstall'] as const),
    arguments: v.optional(v.string({ max: 1000, message: 'Arguments must be less than 1000 characters' }))
});

// Validation schema for query parameters (using Zod for transform)
const listCommandsQuerySchema = z.object({
    limit: z.string().optional().transform((val) => {
        const parsed = parseInt(val || '10', 10);
        return isNaN(parsed) ? 10 : Math.min(Math.max(parsed, 1), 100);
    })
});

// GET /api/devices/:id/commands - List device commands
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    // Extract params from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.indexOf('devices') + 1];

    try {

        const searchParams = url.searchParams;
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        // Check if device exists - tenant isolation is handled by withCustomerContext
        const device = await tenantPrisma.client.device.findUnique({
            where: {id},
        });

        if (!device) {
            return ApiResponse.notFound('Device not found');
        }

        // Fetch device commands - tenant isolation is handled by withCustomerContext
        const commands = await tenantPrisma.client.deviceCommand.findMany({
            where: {deviceId: id},
            orderBy: {createdAt: 'desc'},
            take: limit,
        });

        return ApiResponse.ok({commands});
    } catch (error) {
        logger.error('Failed to fetch device commands:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId: id
        });
        return ApiResponse.internalError('Failed to fetch device commands');
    }
});

// POST /api/devices/:id/commands - Issue a new command to a device
export const POST = withCustomerContext(async (request: AuthenticatedRequest) => {
    // Extract params from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.indexOf('devices') + 1];

    try {
        const body = await request.json();

        // Validate input with Zod schema
        const validationResult = createCommandSchema.safeParse(body);
        if (!validationResult.success) {
            logger.warn('Command creation validation failed', {
                deviceId: id,
                errors: validationResult.errors?.map(e => e.message) || []
            });
            return ApiResponse.badRequest('Invalid input', validationResult.errors);
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            return ApiResponse.badRequest('Invalid input');
        }

        const { command: commandInput, arguments: commandArgs } = validationResult.data;
        const commandType = commandInput.toUpperCase() as keyof typeof SUPPORTED_COMMANDS;

        // Check if device exists - tenant isolation is handled by withCustomerContext
        const device = await tenantPrisma.client.device.findUnique({
            where: {id},
        });

        if (!device) {
            return ApiResponse.notFound('Device not found');
        }

        // Create command in database
        const command = await tenantPrisma.client.deviceCommand.create({
            data: {
                deviceId: id,
                command: SUPPORTED_COMMANDS[commandType],
                arguments: commandArgs,
                status: mapCommandStatusToPrisma(CommandStatus.PENDING),
            },
        });

        // Log the command creation
        logger.info(`Command created for device ${device.hostname}`, {
            deviceId: id,
            commandId: command.id,
            commandType,
            arguments: commandArgs,
        });

        // Execute or queue the command based on device status
        // Execute or queue the command using CommandQueueService
        try {
            // Only import on the server side
            if (typeof window === 'undefined') {
                if (!commandQueueModule) {
                    // Dynamic import that will only be executed at runtime on the server
                    const { CommandQueueService } = await import('@/lib/device/application/services/command-queue.service');
                    const { ServiceContainer } = await import('@/lib/shared/infrastructure/container/service-container');
                    const serviceContainer = ServiceContainer.getInstance();
                    commandQueueModule = CommandQueueService.getInstance(
                        serviceContainer.getDeviceRepository(),
                        serviceContainer.getDeviceCommandRepository()
                    );
                }

                // Now we can use the commandQueue
                await commandQueueModule.executeOrQueue(id, command.id);
            } else {
                logger.warn('Command execution is only available on the server side');
            }
        } catch (error) {
            logger.error(`Failed to queue command ${command.id}:`, {
                error: error instanceof Error ? error.message : String(error),
                deviceId: id,
                commandId: command.id,
            });
        }

        return ApiResponse.created({
            command,
            message: 'Command issued successfully',
        });
    } catch (error) {
        logger.error('Failed to issue command:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId: id,
        });
        return ApiResponse.internalError('Failed to issue command');
    }
});
