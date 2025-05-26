import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enhanced device registration with Tailscale metadata
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Extract Tailscale headers
        const tailscaleUser = request.headers.get('X-Tailscale-User');
        const tailscaleName = request.headers.get('X-Tailscale-Name');
        const tailscaleLogin = request.headers.get('X-Tailscale-Login');
        const tailscaleTailnet = request.headers.get('X-Tailscale-Tailnet');

        // Get device IP from Tailscale
        const clientIP = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

        const deviceData = {
            ...body,
            tailscale_ip: clientIP,
            tailscale_user: tailscaleUser,
            tailscale_name: tailscaleName,
            tailscale_login: tailscaleLogin,
            tailscale_tailnet: tailscaleTailnet
        };

        // Register device with Tailscale context
        const device = await prisma.device.upsert({
            where: { deviceId: body.device_id },
            update: {
                ...deviceData,
                lastSeen: new Date(),
                status: 'ONLINE'
            },
            create: {
                ...deviceData,
                status: 'ONLINE',
                registeredAt: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            device,
            tailscale: {
                user: tailscaleUser,
                name: tailscaleName,
                ip: clientIP
            }
        });

    } catch (error) {
        console.error('Tailscale device registration failed:', error);
        return NextResponse.json(
            { error: 'Registration failed' },
            { status: 500 }
        );
    }
}
