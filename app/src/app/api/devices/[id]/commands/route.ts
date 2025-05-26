// app/src/app/api/devices/[id]/commands/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, CommandStatus } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
    isDevelopment,
} from '@/lib/env';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

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
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const searchParams = new URL(request.url).searchParams;
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        // Check if device exists
        const device = await prisma.device.findUnique({
            where: { id },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        // Fetch device commands
        const commands = await prisma.deviceCommand.findMany({
            where: { deviceId: id },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ commands });
    } catch (error) {
        console.error('Failed to fetch device commands:', error);
        return NextResponse.json(
            { error: 'Failed to fetch device commands' },
            { status: 500 }
        );
    }
}

// POST /api/devices/:id/commands - Issue a new command to a device
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();

        // Validate required fields
        if (!body.command) {
            return NextResponse.json(
                { error: 'Command type is required' },
                { status: 400 }
            );
        }

        // Check if device exists
        const device = await prisma.device.findUnique({
            where: { id },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        // Check if command is supported
        const commandType = body.command.toUpperCase();
        if (!Object.keys(SUPPORTED_COMMANDS).includes(commandType)) {
            return NextResponse.json(
                { error: 'Unsupported command type' },
                { status: 400 }
            );
        }

        // Create command in database
        const command = await prisma.deviceCommand.create({
            data: {
                deviceId: id,
                command: SUPPORTED_COMMANDS[commandType as keyof typeof SUPPORTED_COMMANDS],
                arguments: body.arguments || '',
                status: CommandStatus.PENDING,
            },
        });

        // For local testing/demo, we'll simulate command execution
        // In production, this would be sent to the device via MQTT, SSH, or another protocol
        setTimeout(async () => {
            try {
                let output = '';
                let error = '';
                let exitCode = 0;

                // Simulate command execution (this would be replaced with actual implementation)
                if (commandType === 'RESTART' || commandType === 'REBOOT') {
                    output = 'Device restart initiated';
                } else if (commandType === 'SHUTDOWN') {
                    output = 'Device shutdown initiated';
                } else if (commandType === 'UPDATE') {
                    output = 'Software update initiated\nDownloading updates...\nApplying updates...\nUpdate completed';
                } else if (commandType === 'CUSTOM') {
                    // For a custom command, we'd normally execute the specified command
                    // Here, we're just simulating it
                    const args = body.arguments || 'echo "Hello from device"';
                    try {
                        // SECURITY NOTE: In a real implementation, you would NEVER pass user input directly to exec
                        // This is just for demonstration purposes
                        // In production, you should validate and sanitize all input
                        output = `SIMULATED OUTPUT: Would execute '${args}'`;
                        if (isDevelopment()) {
                            const { stdout, stderr } = await execAsync(`echo "SIMULATED: ${args}"`);
                            output = stdout;
                            error = stderr;
                        }
                    } catch (err: any) {
                        error = err.message;
                        exitCode = 1;
                    }
                }

                // Update command status in database
                await prisma.deviceCommand.update({
                    where: { id: command.id },
                    data: {
                        status: exitCode === 0 ? CommandStatus.COMPLETED : CommandStatus.FAILED,
                        output,
                        error,
                        exitCode,
                        executedAt: new Date(),
                    },
                });

                // Update device status based on command
                if ((commandType === 'RESTART' || commandType === 'REBOOT') && exitCode === 0) {
                    await prisma.device.update({
                        where: { id },
                        data: {
                            status: 'OFFLINE',
                            updatedAt: new Date(),
                        },
                    });
                }
            } catch (error) {
                console.error(`Error executing command ${command.id}:`, error);
                await prisma.deviceCommand.update({
                    where: { id: command.id },
                    data: {
                        status: CommandStatus.FAILED,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        executedAt: new Date(),
                    },
                });
            }
        }, 2000); // Simulate a delay for command execution

        return NextResponse.json({
            command,
            message: 'Command issued successfully',
        });
    } catch (error) {
        console.error('Failed to issue command:', error);
        return NextResponse.json(
            { error: 'Failed to issue command' },
            { status: 500 }
        );
    }
}