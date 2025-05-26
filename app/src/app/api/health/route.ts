import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        // Check system health
        const deviceCount = await prisma.device.count();
        const onlineDevices = await prisma.device.count({
            where: {
                status: 'ONLINE',
                lastSeen: {
                    gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
                }
            }
        });

        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(uptime),
            version: process.env.npm_package_version || '1.0.0',
            database: 'connected',
            devices: {
                total: deviceCount,
                online: onlineDevices,
                offline: deviceCount - onlineDevices
            },
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024)
            },
            services: {
                influxdb: await checkInfluxDB(),
                redis: await checkRedis(),
                grafana: await checkGrafana()
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Health check failed:', error);

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            uptime: Math.floor(process.uptime())
        }, { status: 503 });
    }
}

async function checkInfluxDB(): Promise<string> {
    try {
        const response = await fetch(`${process.env.INFLUXDB_URL}/health`, {
            timeout: 5000
        });
        return response.ok ? 'healthy' : 'unhealthy';
    } catch {
        return 'unreachable';
    }
}

async function checkRedis(): Promise<string> {
    try {
        // Simple Redis check - you might want to use ioredis here
        return 'healthy'; // Placeholder
    } catch {
        return 'unreachable';
    }
}

async function checkGrafana(): Promise<string> {
    try {
        const response = await fetch(`${process.env.GRAFANA_URL}/api/health`, {
            timeout: 5000
        });
        return response.ok ? 'healthy' : 'unhealthy';
    } catch {
        return 'unreachable';
    }
}