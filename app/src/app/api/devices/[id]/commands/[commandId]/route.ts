import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/devices/:id/commands/:commandId - Get command details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string, commandId: string } }
) {
    try {
        const { id, commandId } = params;

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

        // Fetch command details
        const command = await prisma.deviceCommand.findFirst({
            where: {
                id: commandId,
                deviceId: id,
            },
        });

        if (!command) {
            return NextResponse.json(
                { error: 'Command not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ command });
    } catch (error) {
        console.error('Failed to fetch command details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch command details' },
            { status: 500 }
        );
    }
}