// app/src/app/api/devices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/devices/:id - Get device details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        // Fetch device details with metrics and alerts
        const device = await prisma.device.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        alerts: {
                            where: { resolved: false }
                        }
                    }
                },
                metrics: {
                    orderBy: { timestamp: 'desc' },
                    take: 100,
                    distinct: ['metric'],
                },
                alerts: {
                    where: { resolved: false },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                commands: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                }
            },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        // Organize metrics by type
        const metricsMap = new Map();
        device.metrics.forEach(metric => {
            if (!metricsMap.has(metric.metric)) {
                metricsMap.set(metric.metric, []);
            }
            metricsMap.get(metric.metric).push(metric);
        });

        // Format the response
        const response = {
            ...device,
            alertCount: device._count.alerts,
            metrics: Object.fromEntries(metricsMap),
            _count: undefined,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Failed to fetch device details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch device details' },
            { status: 500 }
        );
    }
}

// PUT /api/devices/:id - Update device information
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();

        // Only allow certain fields to be updated
        const allowedFields = [
            'hostname',
            'location',
            'description',
            'status',
        ];

        // Filter out fields that aren't allowed to be updated
        const updateData = Object.keys(body)
            .filter(key => allowedFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = body[key];
                return obj;
            }, {} as any);

        // Add updatedAt field
        updateData.updatedAt = new Date();

        // Update device
        const updatedDevice = await prisma.device.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({
            device: updatedDevice,
            message: 'Device updated successfully'
        });
    } catch (error) {
        console.error('Failed to update device:', error);
        return NextResponse.json(
            { error: 'Failed to update device' },
            { status: 500 }
        );
    }
}

// DELETE /api/devices/:id - Delete a device
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

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

        // Delete device
        await prisma.device.delete({
            where: { id },
        });

        return NextResponse.json({
            message: 'Device deleted successfully'
        });
    } catch (error) {
        console.error('Failed to delete device:', error);
        return NextResponse.json(
            { error: 'Failed to delete device' },
            { status: 500 }
        );
    }
}