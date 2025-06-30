import {NextRequest, NextResponse} from 'next/server';
import {AlertSeverity, AlertType, DeviceStatus, DeviceType, PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {authenticate, validateApiKey} from '@/lib/auth';
import { DeviceCapabilityDetector } from '@/lib/command-executor';

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

// GET /api/devices - List all devices with direct JWT validation
export async function GET(request: NextRequest) {
    try {
        console.log('🔐 DEVICES GET: Starting direct authentication');

        // Extract token directly
        const cookieToken = request.cookies.get('auth-token')?.value;
        const authHeader = request.headers.get('authorization');
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

        const token = cookieToken || bearerToken;

        console.log('🔐 DEVICES GET: Token sources:', {
            cookieToken: !!cookieToken,
            bearerToken: !!bearerToken,
            finalToken: !!token
        });

        if (!token) {
            return NextResponse.json({error: 'No token provided'}, {status: 401});
        }

        // Validate session directly in database
        console.log('🔍 DEVICES GET: Validating session in database');
        const session = await prisma.session.findFirst({
            where: {
                token,
                expiresAt: {
                    gt: new Date()
                },
                deletedAt: null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        role: true,
                        customerId: true,
                        deletedAt: true
                    }
                }
            }
        });

        if (!session || session.user.deletedAt) {
            console.log('❌ DEVICES GET: No valid session found');
            return NextResponse.json({error: 'Session expired or invalid'}, {status: 401});
        }

        console.log('✅ DEVICES GET: Valid session found:', {
            userId: session.user.id,
            email: session.user.email,
            role: session.user.role,
            customerId: session.user.customerId
        });

        const userId = session.user.id;
        const userRole = session.user.role;
        const userCustomerId = session.user.customerId;

        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
        const skip = (page - 1) * limit;

        // Build device filter
        const deviceFilter: any = {
            deletedAt: null // Only show non-deleted devices
        };

        // Add status filter if provided
        if (status) {
            deviceFilter.status = status;
        }

        // CRITICAL: Multi-tenant filtering
        // SUPERADMIN can see all devices, others only see their customer's devices
        if (userRole !== 'SUPERADMIN') {
            if (!userCustomerId) {
                return NextResponse.json(
                    {error: 'Missing customer context'},
                    {status: 400}
                );
            }
            deviceFilter.customerId = userCustomerId;
        }

        console.log('🏢 DEVICES GET: Filter applied:', {
            userRole,
            userCustomerId,
            deviceFilter: JSON.stringify(deviceFilter)
        });

        // Fetch devices with pagination and tenant filtering
        const devices = await prisma.device.findMany({
            where: deviceFilter,
            orderBy: {lastSeen: 'desc'},
            skip,
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                },
                _count: {
                    select: {
                        alerts: {
                            where: {
                                resolved: false,
                                deletedAt: null
                            }
                        }
                    }
                }
            }
        });

        // Get total count for pagination
        const totalCount = await prisma.device.count({
            where: deviceFilter
        });

        // Format devices for response
        const formattedDevices = devices.map(device => ({
            id: device.id,
            deviceId: device.deviceId,
            hostname: device.hostname,
            deviceType: device.deviceType,
            deviceModel: device.deviceModel,
            architecture: device.architecture,
            location: device.location,
            description: device.description,
            ipAddress: device.ipAddress,
            tailscaleIp: device.tailscaleIp,
            macAddress: device.macAddress,
            status: device.status,
            lastSeen: device.lastSeen,
            lastBoot: device.lastBoot,
            uptime: device.uptime,
            cpuUsage: device.cpuUsage,
            cpuTemp: device.cpuTemp,
            memoryUsage: device.memoryUsage,
            memoryTotal: device.memoryTotal,
            diskUsage: device.diskUsage,
            diskTotal: device.diskTotal,
            loadAverage: device.loadAverage,
            appStatus: device.appStatus,
            agentVersion: device.agentVersion,
            registeredAt: device.registeredAt,
            updatedAt: device.updatedAt,
            user: device.user,
            customer: device.customer,
            alertsCount: device._count.alerts
        }));

        // Calculate stats
        const stats = {
            total: formattedDevices.length,
            online: formattedDevices.filter((d: {status: string;}) => d.status === 'ONLINE').length,
            offline: formattedDevices.filter((d: {status: string;}) => d.status === 'OFFLINE').length,
            maintenance: formattedDevices.filter((d: {status: string;}) => d.status === 'MAINTENANCE').length,
            error: formattedDevices.filter((d: {status: string;}) => d.status === 'ERROR').length
        };

        console.log('📊 DEVICES GET: Results:', {
            totalDevices: formattedDevices.length,
            userRole,
            userCustomerId,
            stats
        });

        return NextResponse.json({
            devices: formattedDevices,
            stats,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error('Failed to fetch devices:', error);
        return NextResponse.json(
            {error: 'Failed to fetch devices'},
            {status: 500}
        );
    }
}

// POST /api/devices - Register new device with multi-tenant support
export async function POST(request: NextRequest) {
    try {
        let userId: string | null = null;
        let authUser: any = null;

        // Try API key authentication first (for device agents)
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace('ApiKey ', '');

        if (apiKey) {
            console.log('🔑 DEVICES: Using API key authentication');
            const { valid, user, apiKeyRecord } = await validateApiKey(apiKey);
            if (valid && user && apiKeyRecord) {
                userId = user.id;
                authUser = {
                    ...user,
                    // Use customerId from API key record (which inherits from user)
                    customerId: apiKeyRecord.customerId || user.customerId
                };
                console.log('🔑 DEVICES POST: API key context:', {
                    userId,
                    userRole: authUser.role,
                    userCustomerId: authUser.customerId,
                    apiKeyCustomerId: apiKeyRecord.customerId
                });
            } else {
                return NextResponse.json({error: 'Invalid API key'}, {status: 401});
            }
        } else {
            // Try JWT authentication (from middleware headers)
            console.log('🔐 DEVICES: Using JWT authentication');
            userId = request.headers.get('x-user-id');
            const userEmail = request.headers.get('x-user-email');
            const userRole = request.headers.get('x-user-role');
            const userCustomerId = request.headers.get('x-customer-id');

            if (!userId) {
                return NextResponse.json({error: 'Unauthorized'}, {status: 401});
            }

            authUser = {
                id: userId,
                email: userEmail,
                role: userRole,
                customerId: userCustomerId
            };
        }

        const body = await request.json();
        const data = deviceRegistrationSchema.parse(body);
        const deviceTypeEnum = data.device_type as DeviceType;

        // CRITICAL: Ensure user has a customerId (except SUPERADMIN)
        if (!authUser.customerId && authUser.role !== 'SUPERADMIN') {
            console.error('🚨 DEVICES: User lacks customerId:', {
                userId: authUser.id,
                email: authUser.email,
                role: authUser.role,
                customerId: authUser.customerId
            });
            return NextResponse.json(
                {error: 'Missing customer context. Please contact support.'},
                {status: 400}
            );
        }

        // For SUPERADMIN without customerId, require explicit customerId in request
        let targetCustomerId = authUser.customerId;
        if (authUser.role === 'SUPERADMIN' && !targetCustomerId) {
            const explicitCustomerId = request.headers.get('x-target-customer-id') ||
                body.customerId;
            if (explicitCustomerId) {
                targetCustomerId = explicitCustomerId;
            } else {
                return NextResponse.json(
                    {error: 'SUPERADMIN must specify target customerId'},
                    {status: 400}
                );
            }
        }

        console.log('🏢 DEVICES: Device registration context:', {
            userRole: authUser.role,
            userCustomerId: authUser.customerId,
            targetCustomerId,
            deviceId: data.device_id
        });

        // Check if device already exists (include soft deleted to prevent conflicts)
        const existingDevice = await prisma.device.findFirst({
            where: {deviceId: data.device_id}
        });

        if (existingDevice) {
            // If device is soft deleted, restore it
            if (existingDevice.deletedAt) {
                console.log('🔄 DEVICES: Restoring soft-deleted device');

                // Detect device capabilities
                const capabilities = await DeviceCapabilityDetector.detectCapabilities({
                    deviceType: deviceTypeEnum,
                    architecture: data.architecture,
                    deviceModel: data.device_model,
                    ipAddress: data.ip_address,
                    tailscaleIp: data.tailscale_ip
                });

                console.log('🔍 DEVICES: Detected capabilities for restoration:', capabilities);

                // Create update data with capabilities
                const updateData: any = {
                    hostname: data.hostname,
                    deviceType: deviceTypeEnum,
                    deviceModel: data.device_model,
                    architecture: data.architecture,
                    location: data.location,
                    ipAddress: data.ip_address,
                    tailscaleIp: data.tailscale_ip,
                    macAddress: data.mac_address,
                    capabilities: capabilities,
                    status: DeviceStatus.ONLINE,
                    lastSeen: new Date(),
                    userId: authUser.id,
                    customerId: targetCustomerId,
                    updatedAt: new Date(),
                    deletedAt: null // Restore the device
                };

                const restoredDevice = await prisma.device.update({
                    where: {id: existingDevice.id},
                    data: updateData
                });

                return NextResponse.json({
                    device: restoredDevice,
                    action: 'restored',
                    message: 'Device restored and updated successfully'
                });
            }

            // Check if the existing device belongs to the same customer
            if (existingDevice.customerId === targetCustomerId) {
                // Same customer - update the device
                console.log('🔄 DEVICES: Updating existing device for same customer');

                // Detect device capabilities
                const capabilities = await DeviceCapabilityDetector.detectCapabilities({
                    deviceType: deviceTypeEnum,
                    architecture: data.architecture,
                    deviceModel: data.device_model,
                    ipAddress: data.ip_address,
                    tailscaleIp: data.tailscale_ip
                });

                console.log('🔍 DEVICES: Detected capabilities for update:', capabilities);

                // Create update data with capabilities
                const updateData: any = {
                    hostname: data.hostname,
                    deviceType: deviceTypeEnum,
                    deviceModel: data.device_model,
                    architecture: data.architecture,
                    location: data.location,
                    ipAddress: data.ip_address,
                    tailscaleIp: data.tailscale_ip,
                    macAddress: data.mac_address,
                    capabilities: capabilities,
                    status: DeviceStatus.ONLINE,
                    lastSeen: new Date(),
                    userId: authUser.id,
                    updatedAt: new Date()
                };

                const updatedDevice = await prisma.device.update({
                    where: {id: existingDevice.id},
                    data: updateData
                });

                return NextResponse.json({
                    device: updatedDevice,
                    action: 'updated',
                    message: 'Device updated successfully'
                });
            } else {
                // Different customer - reject registration
                console.log('🚫 DEVICES: Device already belongs to different customer');
                return NextResponse.json(
                    {
                        error: 'Device already registered by another customer',
                        action: 'duplicate_rejected',
                        existing_customer_different: true
                    },
                    {status: 409}
                );
            }
        }

        // Create new device with proper customerId
        console.log('✨ DEVICES: Creating new device');

        // Detect device capabilities
        const capabilities = await DeviceCapabilityDetector.detectCapabilities({
            deviceType: deviceTypeEnum,
            architecture: data.architecture,
            deviceModel: data.device_model,
            ipAddress: data.ip_address,
            tailscaleIp: data.tailscale_ip
        });

        console.log('🔍 DEVICES: Detected capabilities:', capabilities);

        // Create device data with capabilities
        const createData: any = {
            deviceId: data.device_id,
            hostname: data.hostname,
            deviceType: deviceTypeEnum,
            deviceModel: data.device_model,
            architecture: data.architecture,
            location: data.location,
            ipAddress: data.ip_address,
            tailscaleIp: data.tailscale_ip,
            macAddress: data.mac_address,
            capabilities: capabilities,
            status: DeviceStatus.ONLINE,
            lastSeen: new Date(),
            userId: authUser.id,
            customerId: targetCustomerId, // CRITICAL: Set the customerId
            registeredAt: new Date(),
            updatedAt: new Date()
        };

        const device = await prisma.device.create({
            data: createData
        });

        console.log('✅ DEVICES: Device created successfully:', {
            deviceId: device.deviceId,
            customerId: device.customerId,
            hostname: device.hostname
        });

        // Create initial alert for new device registration
        await prisma.alert.create({
            data: {
                type: AlertType.DEVICE_REGISTERED,
                severity: AlertSeverity.INFO,
                title: 'New Device Registered',
                message: `Device ${device.hostname} (${device.deviceId}) has been registered`,
                source: 'device_registration',
                deviceId: device.id,
                userId: authUser.id,
                customerId: targetCustomerId
            }
        });

        return NextResponse.json({
            device,
            action: 'created',
            message: 'Device registered successfully'
        }, {status: 201});

    } catch (error) {
        console.error('Device registration error:', error);
        return NextResponse.json(
            {error: 'Failed to register device'},
            {status: 500}
        );
    }
}
