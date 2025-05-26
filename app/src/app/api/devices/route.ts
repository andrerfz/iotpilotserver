import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, DeviceType, DeviceStatus, AlertType, AlertSeverity } from '@prisma/client';
import { z } from 'zod';
import { authenticate, validateApiKey } from '@/lib/auth';

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

// GET /api/devices - List all devices (requires authentication)
export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const { user, error } = await authenticate(request);
        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as DeviceStatus | null;
        const type = searchParams.get('type') as DeviceType | null;
        const location = searchParams.get('location');

        const where: any = {};

        // Users can only see their own devices unless they're admin
        if (user.role !== 'ADMIN') {
            where.userId = user.id;
        }

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
                },
                user: {
                    select: {
                        username: true,
                        email: true
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

// POST /api/devices - Register a new device (requires API key or user auth)
export async function POST(request: NextRequest) {
    try {
        let userId: string | null = null;

        // Try API key authentication first
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace('ApiKey ', '');

        if (apiKey) {
            const { valid, user } = await validateApiKey(apiKey);
            if (valid && user) {
                userId = user.id;
            } else {
                return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
            }
        } else {
            // Try user authentication
            const { user, error } = await authenticate(request);
            if (error || !user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            userId = user.id;
        }

        const body = await request.json();
        const data = deviceRegistrationSchema.parse(body);

        // Map string device type to enum
        const deviceTypeEnum = data.device_type as DeviceType;

        // Check if device already exists
        const existingDevice = await prisma.device.findUnique({
            where: { deviceId: data.device_id }
        });

        if (existingDevice) {
            // Update existing device (only if owned by user or user is admin)
            const { user: authUser } = await authenticate(request);
            if (authUser?.role !== 'ADMIN' && existingDevice.userId !== userId) {
                return NextResponse.json(
                    { error: 'Device belongs to another user' },
                    { status: 403 }
                );
            }

            const updatedDevice = await prisma.device.update({
                where: { deviceId: data.device_id },
                data: {
                    hostname: data.hostname,
                    deviceType: deviceTypeEnum,
                    deviceModel: data.device_model,
                    architecture: data.architecture,
                    location: data.location,
                    ipAddress: data.ip_address,
                    tailscaleIp: data.tailscale_ip,
                    macAddress: data.mac_address,
                    status: DeviceStatus.ONLINE,
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
                deviceType: deviceTypeEnum,
                deviceModel: data.device_model,
                architecture: data.architecture,
                location: data.location,
                ipAddress: data.ip_address,
                tailscaleIp: data.tailscale_ip,
                macAddress: data.mac_address,
                status: DeviceStatus.ONLINE,
                lastSeen: new Date(),
                registeredAt: new Date(),
                userId: userId
            }
        });

        // Create welcome alert
        await prisma.alert.create({
            data: {
                deviceId: newDevice.id,
                userId: userId,
                type: AlertType.CUSTOM,
                severity: AlertSeverity.INFO,
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