import {NextRequest, NextResponse} from 'next/server';
import {AlertSeverity, AlertType, DeviceStatus, DeviceType, PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {authenticate, validateApiKey} from '@/lib/auth';

const prisma = new PrismaClient();

const deviceRegistrationSchema = z.object({
    device_id: z.string(),
    hostname: z.string(),
    device_type: z.string(),
    device_model: z.string().optional(),
    architecture: z.string(),
    location: z.string().optional(),
    ip_address: z.string().optional(),
    tailscale_ip: z.string().optional(),
    mac_address: z.string().optional()
});

// GET /api/devices - List all devices
export async function GET(request: NextRequest) {
    try {
        const {
            user,
            error
        } = await authenticate(request);
        if (error || !user) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        const searchParams = new URL(request.url).searchParams;
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        // Build where clause
        const whereClause: any = {};

        // Filter by user (non-admin users only see their devices)
        if (user.role !== 'ADMIN') {
            whereClause.userId = user.id;
        }

        // Filter by status if provided
        if (status) {
            whereClause.status = status;
        }

        // Fetch devices with alert counts
        const devices = await prisma.device.findMany({
            where: whereClause,
            orderBy: {lastSeen: 'desc'},
            take: limit,
            include: {
                _count: {
                    select: {
                        alerts: {
                            where: {resolved: false}
                        }
                    }
                }
            }
        });

        // Format devices for response
        const formattedDevices = devices.map((device: {
            _count: {
                alerts: any;
            };
        }) => ({
            ...device,
            alertCount: device._count.alerts
        }));

        // Calculate stats
        const stats = {
            total: devices.length,
            online: devices.filter((d: {
                status: string;
            }) => d.status === 'ONLINE').length,
            offline: devices.filter((d: {
                status: string;
            }) => d.status === 'OFFLINE').length,
            maintenance: devices.filter((d: {
                status: string;
            }) => d.status === 'MAINTENANCE').length,
            error: devices.filter((d: {
                status: string;
            }) => d.status === 'ERROR').length
        };

        return NextResponse.json({
            devices: formattedDevices,
            stats
        });

    } catch (error) {
        console.error('Failed to fetch devices:', error);
        return NextResponse.json(
            {error: 'Failed to fetch devices'},
            {status: 500}
        );
    }
}

// POST /api/devices - Register new device
export async function POST(request: NextRequest) {
    try {
        let userId: string | null = null;
        let authUser: any = null;

        // Try API key authentication first
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace('ApiKey ', '');

        if (apiKey) {
            const {
                valid,
                user
            } = await validateApiKey(apiKey);
            if (valid && user) {
                userId = user.id;
                authUser = user;
            } else {
                return NextResponse.json({error: 'Invalid API key'}, {status: 401});
            }
        } else {
            // Try user authentication
            const {
                user,
                error
            } = await authenticate(request);
            if (error || !user) {
                return NextResponse.json({error: 'Unauthorized'}, {status: 401});
            }
            userId = user.id;
            authUser = user;
        }

        const body = await request.json();
        const data = deviceRegistrationSchema.parse(body);
        const deviceTypeEnum = data.device_type as DeviceType;

        // Check if user has a customerId
        if (!authUser.customerId) {
            return NextResponse.json(
                {error: 'User is not associated with a customer'},
                {status: 400}
            );
        }

        // Check if device already exists
        const existingDevice = await prisma.device.findUnique({
            where: {deviceId: data.device_id}
        });

        if (existingDevice) {
            // STRICT OWNERSHIP CHECK - prevent duplicates across users
            if (existingDevice.userId !== userId && authUser?.role !== 'ADMIN') {
                return NextResponse.json(
                    {
                        error: 'Device already registered by another user',
                        action: 'duplicate_rejected',
                        existing_owner: true
                    },
                    {status: 409} // Conflict status
                );
            }

            // SAME USER - update existing device (this is expected behavior)
            const updatedDevice = await prisma.device.update({
                where: {deviceId: data.device_id},
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
                message: 'Device updated successfully',
                action: 'updated'
            });
        }

        // CREATE NEW DEVICE
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
                userId: userId,
                customerId: authUser.customerId
            }
        });

        // Create welcome alert only for new devices
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
            message: 'Device registered successfully',
            action: 'created'
        }, {status: 201});

    } catch (error: any) {
        // Handle Prisma unique constraint violations
        if (error?.code === 'P2002') {
            return NextResponse.json(
                {
                    error: 'Device ID already exists',
                    action: 'duplicate_rejected',
                    constraint_violation: true
                },
                {status: 409}
            );
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid device data',
                    details: error.errors
                },
                {status: 400}
            );
        }

        console.error('Failed to register device:', error);
        return NextResponse.json(
            {error: 'Failed to register device'},
            {status: 500}
        );
    }
}
