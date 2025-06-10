export async function POST(request: NextRequest) {
    try {
        let userId: string | null = null;
        let authUser: any = null;

        // Try API key authentication first
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace('ApiKey ', '');

        if (apiKey) {
            const { valid, user } = await validateApiKey(apiKey);
            if (valid && user) {
                userId = user.id;
                authUser = user;
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
            authUser = user;
        }

        const body = await request.json();
        const data = deviceRegistrationSchema.parse(body);
        const deviceTypeEnum = data.device_type as DeviceType;

        // Check if device already exists
        const existingDevice = await prisma.device.findUnique({
            where: { deviceId: data.device_id }
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
                    { status: 409 } // Conflict status
                );
            }

            // SAME USER - update existing device (this is expected behavior)
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
                userId: userId
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
        }, { status: 201 });

    } catch (error) {
        // Handle Prisma unique constraint violations
        if (error.code === 'P2002') {
            return NextResponse.json(
                {
                    error: 'Device ID already exists',
                    action: 'duplicate_rejected',
                    constraint_violation: true
                },
                { status: 409 }
            );
        }

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