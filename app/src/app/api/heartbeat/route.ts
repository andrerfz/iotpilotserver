import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AlertType, AlertSeverity } from '@prisma/client';
import { z } from 'zod';
import { validateApiKey } from '@/lib/auth';

const prisma = new PrismaClient();

const heartbeatSchema = z.object({
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
    timestamp: z.string().optional(),
    ip_address: z.string().optional(),
    tailscale_ip: z.string().optional()
});

// POST /api/devices/heartbeat - Receive device heartbeat (API key required)
export async function POST(request: NextRequest) {
    try {
        // Validate API key for device authentication
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace('ApiKey ', '') ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key required for device heartbeat' },
                { status: 401 }
            );
        }

        const { valid, user } = await validateApiKey(apiKey);
        if (!valid || !user) {
            return NextResponse.json(
                { error: 'Invalid API key' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const data = heartbeatSchema.parse(body);

        // Find the device
        const device = await prisma.device.findUnique({
            where: { deviceId: data.device_id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found. Please register the device first.' },
                { status: 404 }
            );
        }

        // Check device ownership (unless API key belongs to admin)
        if (user.role !== 'ADMIN' && device.userId !== user.id) {
            return NextResponse.json(
                { error: 'Device belongs to another user' },
                { status: 403 }
            );
        }

        // Update device with latest data
        const updatedDevice = await prisma.device.update({
            where: { deviceId: data.device_id },
            data: {
                status: 'ONLINE',
                lastSeen: new Date(),
                uptime: data.uptime,
                loadAverage: data.load_average,
                cpuUsage: data.cpu_usage,
                cpuTemp: data.cpu_temperature,
                memoryUsage: data.memory_usage_percent,
                memoryTotal: data.memory_total_mb,
                diskUsage: data.disk_usage_percent,
                diskTotal: data.disk_total,
                appStatus: data.app_status || 'UNKNOWN',
                agentVersion: data.agent_version,
                lastBoot: data.last_boot ? new Date(data.last_boot) : null,
                ipAddress: data.ip_address,
                tailscaleIp: data.tailscale_ip,
                updatedAt: new Date()
            }
        });

        // Store metrics for historical tracking
        const metricsToStore = [];

        if (data.cpu_usage !== undefined) {
            metricsToStore.push({
                deviceId: device.id,
                metric: 'cpu_usage',
                value: data.cpu_usage,
                unit: '%'
            });
        }

        if (data.cpu_temperature !== undefined) {
            metricsToStore.push({
                deviceId: device.id,
                metric: 'cpu_temperature',
                value: data.cpu_temperature,
                unit: '°C'
            });
        }

        if (data.memory_usage_percent !== undefined) {
            metricsToStore.push({
                deviceId: device.id,
                metric: 'memory_usage',
                value: data.memory_usage_percent,
                unit: '%'
            });
        }

        if (data.disk_usage_percent !== undefined) {
            metricsToStore.push({
                deviceId: device.id,
                metric: 'disk_usage',
                value: data.disk_usage_percent,
                unit: '%'
            });
        }

        // Batch insert metrics
        if (metricsToStore.length > 0) {
            await prisma.deviceMetric.createMany({
                data: metricsToStore
            });
        }

        // Check for alerts
        await checkDeviceAlerts(device.id, data, device.userId, device.customerId);

        // Send data to InfluxDB for time-series storage
        await sendToInfluxDB(data);

        // Log device heartbeat
        console.log(`Device heartbeat received: ${data.device_id} from user: ${user.username}`);

        return NextResponse.json({
            status: 'success',
            message: 'Heartbeat received',
            device: {
                id: updatedDevice.id,
                status: updatedDevice.status,
                lastSeen: updatedDevice.lastSeen
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid heartbeat data', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to process heartbeat:', error);
        return NextResponse.json(
            { error: 'Failed to process heartbeat' },
            { status: 500 }
        );
    }
}

// Check for alert conditions
async function checkDeviceAlerts(deviceId: string, data: any, userId: string | null, customerId: string) {
    const alerts: Array<{
        deviceId: string;
        userId: string | null;
        customerId: string;  // Add this field
        type: AlertType;
        severity: AlertSeverity;
        title: string;
        message: string;
    }> = [];

    // High CPU usage
    if (data.cpu_usage && data.cpu_usage > 85) {
        alerts.push({
            deviceId,
            userId,
            customerId,
            type: AlertType.HIGH_CPU,
            severity: data.cpu_usage > 95 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            title: 'High CPU Usage',
            message: `CPU usage is ${data.cpu_usage}%`
        });
    }

    // High memory usage
    if (data.memory_usage_percent && data.memory_usage_percent > 85) {
        alerts.push({
            deviceId,
            userId,
            customerId,
            type: AlertType.HIGH_MEMORY,
            severity: data.memory_usage_percent > 95 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            title: 'High Memory Usage',
            message: `Memory usage is ${data.memory_usage_percent}%`
        });
    }

    // High temperature
    if (data.cpu_temperature && data.cpu_temperature > 70) {
        alerts.push({
            deviceId,
            userId,
            customerId,
            type: AlertType.HIGH_TEMPERATURE,
            severity: data.cpu_temperature > 80 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            title: 'High Temperature',
            message: `CPU temperature is ${data.cpu_temperature}°C`
        });
    }

    // Low disk space
    if (data.disk_usage_percent && data.disk_usage_percent > 85) {
        alerts.push({
            deviceId,
            userId,
            customerId,
            type: AlertType.LOW_DISK_SPACE,
            severity: data.disk_usage_percent > 95 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            title: 'Low Disk Space',
            message: `Disk usage is ${data.disk_usage_percent}%`
        });
    }

    // Application errors
    if (data.app_status === 'ERROR') {
        alerts.push({
            deviceId,
            userId,
            customerId,
            type: AlertType.APPLICATION_ERROR,
            severity: AlertSeverity.ERROR,
            title: 'Application Error',
            message: 'Device application is in error state'
        });
    }

    // Create alerts that don't already exist
    for (const alertData of alerts) {
        const existingAlert = await prisma.alert.findFirst({
            where: {
                deviceId: alertData.deviceId,
                type: alertData.type,
                resolved: false
            }
        });

        if (!existingAlert) {
            await prisma.alert.create({
                data: alertData
            });
        }
    }
}

// Send metrics to InfluxDB
async function sendToInfluxDB(data: any) {
    try {
        const influxUrl = process.env.INFLUXDB_URL;
        const influxToken = process.env.INFLUXDB_TOKEN;
        const influxOrg = process.env.INFLUXDB_ORG || 'iotpilot';
        const influxBucket = process.env.INFLUXDB_BUCKET || 'devices';

        if (!influxUrl || !influxToken) {
            console.log('InfluxDB not configured, skipping metrics storage');
            return;
        }

        const points = [];
        const timestamp = new Date().getTime() * 1000000; // nanoseconds

        // Prepare measurement points
        if (data.cpu_usage !== undefined) {
            points.push(`cpu_usage,device_id=${data.device_id} value=${data.cpu_usage} ${timestamp}`);
        }

        if (data.cpu_temperature !== undefined) {
            points.push(`cpu_temperature,device_id=${data.device_id} value=${data.cpu_temperature} ${timestamp}`);
        }

        if (data.memory_usage_percent !== undefined) {
            points.push(`memory_usage,device_id=${data.device_id} value=${data.memory_usage_percent} ${timestamp}`);
        }

        if (data.disk_usage_percent !== undefined) {
            points.push(`disk_usage,device_id=${data.device_id} value=${data.disk_usage_percent} ${timestamp}`);
        }

        if (points.length === 0) return;

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // Send to InfluxDB
        const response = await fetch(`${influxUrl}/api/v2/write?org=${influxOrg}&bucket=${influxBucket}`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${influxToken}`,
                'Content-Type': 'text/plain'
            },
            body: points.join('\n'),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error('Failed to send metrics to InfluxDB:', response.statusText);
        }

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error('InfluxDB request timed out');
        } else {
            console.error('Error sending metrics to InfluxDB:', error);
        }
    }
}