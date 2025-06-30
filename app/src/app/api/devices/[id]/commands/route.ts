import {NextResponse} from 'next/server';
import {CommandStatus} from '@prisma/client';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {logger} from '@/lib/logger';

// We'll dynamically import the commandQueue at runtime
let commandQueueModule: any = null;

// Supported command types and their mappings
const SUPPORTED_COMMANDS = {
    RESTART: 'restart',
    SHUTDOWN: 'shutdown',
    UPDATE: 'update',
    CUSTOM: 'custom',
    REBOOT: 'reboot',
    INSTALL: 'install',
    UNINSTALL: 'uninstall',
};

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
            return NextResponse.json(
                {error: 'Device not found'},
                {status: 404}
            );
        }

        // Fetch device commands - tenant isolation is handled by withCustomerContext
        const commands = await tenantPrisma.client.deviceCommand.findMany({
            where: {deviceId: id},
            orderBy: {createdAt: 'desc'},
            take: limit,
        });

        return NextResponse.json({commands});
    } catch (error) {
        logger.error('Failed to fetch device commands:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId: id
        });
        return NextResponse.json(
            {error: 'Failed to fetch device commands'},
            {status: 500}
        );
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

        // Validate required fields
        if (!body.command) {
            return NextResponse.json(
                {error: 'Command type is required'},
                {status: 400}
            );
        }

        // Check if device exists - tenant isolation is handled by withCustomerContext
        const device = await tenantPrisma.client.device.findUnique({
            where: {id},
        });

        if (!device) {
            return NextResponse.json(
                {error: 'Device not found'},
                {status: 404}
            );
        }

        // Check if command is supported
        const commandType = body.command.toUpperCase();
        if (!Object.keys(SUPPORTED_COMMANDS).includes(commandType)) {
            return NextResponse.json(
                {error: 'Unsupported command type'},
                {status: 400}
            );
        }

        // Create command in database
        const command = await tenantPrisma.client.deviceCommand.create({
            data: {
                deviceId: id,
                command: SUPPORTED_COMMANDS[commandType as keyof typeof SUPPORTED_COMMANDS],
                arguments: body.arguments || '',
                status: CommandStatus.PENDING,
            },
        });

        // Log the command creation
        logger.info(`Command created for device ${device.hostname}`, {
            deviceId: id,
            commandId: command.id,
            commandType,
            arguments: body.arguments || '',
        });

        // Execute or queue the command based on device status
        // Dynamically import the commandQueue module only on the server side
        try {
            // Only import on the server side
            if (typeof window === 'undefined') {
                if (!commandQueueModule) {
                    // Dynamic import that will only be executed at runtime on the server
                    const module = await import('@/lib/command-executor');
                    commandQueueModule = module.commandQueue;
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

        return NextResponse.json({
            command,
            message: 'Command issued successfully',
        });
    } catch (error) {
        logger.error('Failed to issue command:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId: id,
        });
        return NextResponse.json(
            {error: 'Failed to issue command'},
            {status: 500}
        );
    }
});
