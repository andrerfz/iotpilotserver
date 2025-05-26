import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Device registration schema
const deviceRegistrationSchema = z.object({
    device_id: z.string(),
    hostname: z.string(),
    device_type: z.enum(['PI_ZERO', 'PI_3', 'PI_4', 'PI_5', 'ORANGE_PI', 'GENERIC']),
    device_model: z.string().optional(),
    architecture: z.string(),
    location: z.string().optional(),
    ip_address: z.string().optional(),
    tailscale_ip: z.string().optional(),
    mac_address: z.string().optional(),
    auto_registered: z.boolean().default(false),
    registration_time: z.string().optional()
});

// Device heartbeat schema
const deviceHeartbeatSchema = z.object({
    device_id: z.string(),
    hostname: z.string(),
    uptime: z.string().optional(),
    load_average: z.string().optional(),
    cpu_usage: z.number().optional(),
    cpu_temperature: z.number().optional(),
    memory_usage_percent: z.number().optional(),
    memory_used_mb: z.number().optional(),
    memory_total_mb: z.number().optional(),
    disk_usage_percent: z.number().optional(),
    disk_used: z.string().optional(),
    disk_total: z.string().optional(),
    app_status: z.enum(['RUNNING', 'STOPPED', 'ERROR', 'NOT_INSTALLED', 'UNKNOWN']).optional(),
    agent_version: z.string().optional(),
    last_boot: z.string().optional(),
    timestamp: z.string().optional()
});

// GET /api/devices - List all devices
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const location = searchParams.get('location');

        const where: any = {};
        if (status) where.status = status;
        if (type) where.deviceType = type;
        if (location) where.location = location;

        const devices = await prisma.device.findMany({
            where,
            include: {
                _count: {
                    select: {
                        alerts: {
                            where: { resolved: false }
                        }
                    }
                }
            },
            orderBy: { lastSeen: 'desc' }
        });

        // Calculate device statistics
        const stats = {
            total: devices.length,
            online: devices.filter(d => d.status === 'ONLINE').length,
            offline: devices.filter(d => d.status === 'OFFLINE').length,
            maintenance: devices.filter(d => d.status === 'MAINTENANCE').length,
            error: devices.filter(d => d.status === 'ERROR').length
        };

        return NextResponse.json({
            devices: devices.map(device => ({
                ...device,
                alertCount: device._count.alerts
            })),
            stats
        });

    } catch (error) {
        console.error('Failed to fetch devices:', error);
        return NextResponse.json(
            { error: 'Failed to fetch devices' },
            { status: 500 }
        );
    }
}

// POST /api/devices - Register a new device
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = deviceRegistrationSchema.parse(body);

        // Check if device already exists
        const existingDevice = await prisma.device.findUnique({
            where: { deviceId: data.device_id }
        });

        if (existingDevice) {
            // Update existing device
            const updatedDevice = await prisma.device.update({
                where: { deviceId: data.device_id },
                data: {
                    hostname: data.hostname,
                    deviceType: data.device_type,
                    deviceModel: data.device_model,
                    architecture: data.architecture,
                    location: data.location,
                    ipAddress: data.ip_address,
                    tailscaleIp: data.tailscale_ip,
                    macAddress: data.mac_address,
                    status: 'ONLINE',
                    lastSeen: new Date(),
                    updatedAt: new Date()
                }
            });

            return NextResponse.json({
                device: updatedDevice,
                message: 'Device updated successfully'
            });
        }

        // Create new device
        const newDevice = await prisma.device.create({
            data: {
                deviceId: data.device_id,
                hostname: data.hostname,
                deviceType: data.device_type,
                deviceModel: data.device_model,
                architecture: data.architecture,
                location: data.location,
                ipAddress: data.ip_address,
                tailscaleIp: data.tailscale_ip,
                macAddress: data.mac_address,
                status: 'ONLINE',
                lastSeen: new Date(),
                registeredAt: new Date()
            }
        });

        // Create welcome alert
        await prisma.alert.create({
            data: {
                deviceId: newDevice.id,
                type: 'CUSTOM',
                severity: 'INFO',
                title: 'Device Registered',
                message: `Device ${data.hostname} (${data.device_id}) has been registered successfully.`
            }
        });

        return NextResponse.json({
            device: newDevice,
            message: 'Device registered successfully'
        }, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid device data', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to register device:', error);
        return NextResponse.json(
            { error: 'Failed to register device' },
            { status: 500 }
        );
    }
}