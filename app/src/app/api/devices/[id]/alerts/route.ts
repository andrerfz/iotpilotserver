import { NextRequest, NextResponse } from 'next/server';

interface Alert {
    id: string;
    deviceId: string;
    type: 'DEVICE_OFFLINE' | 'HIGH_CPU' | 'HIGH_MEMORY' | 'HIGH_TEMPERATURE' | 'LOW_DISK_SPACE' | 'APPLICATION_ERROR' | 'SYSTEM_ERROR' | 'SECURITY_ALERT' | 'CUSTOM';
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    title: string;
    message: string;
    source?: string;
    resolved: boolean;
    resolvedAt?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}

// In-memory storage for demo purposes
const alertsStore = new Map<string, Alert[]>();

function generateMockAlerts(deviceId: string): Alert[] {
    return [
        {
            id: `alert-1-${deviceId}`,
            deviceId,
            type: 'HIGH_CPU',
            severity: 'WARNING',
            title: 'High CPU Usage',
            message: 'CPU usage has exceeded 85% for the past 5 minutes',
            resolved: false,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            metadata: { threshold: 85, currentValue: 92, duration: '5 minutes' }
        },
        {
            id: `alert-2-${deviceId}`,
            deviceId,
            type: 'HIGH_TEMPERATURE',
            severity: 'CRITICAL',
            title: 'Critical Temperature',
            message: 'Device temperature has reached 78°C',
            resolved: true,
            resolvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            metadata: { threshold: 70, currentValue: 78, location: 'CPU Core' }
        },
        {
            id: `alert-3-${deviceId}`,
            deviceId,
            type: 'LOW_DISK_SPACE',
            severity: 'WARNING',
            title: 'Low Disk Space',
            message: 'Root partition disk usage is at 92%',
            resolved: false,
            createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            metadata: { threshold: 90, currentValue: 92, partition: '/dev/sda1', availableSpace: '2.1 GB' }
        },
        {
            id: `alert-4-${deviceId}`,
            deviceId,
            type: 'DEVICE_OFFLINE',
            severity: 'ERROR',
            title: 'Device Offline',
            message: 'Device has been offline for 15 minutes',
            resolved: true,
            resolvedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            metadata: { lastSeen: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), reason: 'Connection timeout' }
        },
        {
            id: `alert-5-${deviceId}`,
            deviceId,
            type: 'HIGH_MEMORY',
            severity: 'WARNING',
            title: 'High Memory Usage',
            message: 'Memory usage is at 87%',
            resolved: false,
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            metadata: { threshold: 85, currentValue: 87, totalMemory: '8 GB', availableMemory: '1.04 GB' }
        },
        {
            id: `alert-6-${deviceId}`,
            deviceId,
            type: 'SECURITY_ALERT',
            severity: 'CRITICAL',
            title: 'Failed Login Attempts',
            message: 'Multiple failed SSH login attempts detected',
            resolved: false,
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            metadata: {
                attempts: 15,
                sourceIPs: ['192.168.1.100', '10.0.0.50'],
                timeWindow: '10 minutes',
                lastAttempt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
            }
        }
    ];
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const deviceId = params.id;
        const url = new URL(request.url);

        // Parse query parameters
        const severity = url.searchParams.get('severity');
        const status = url.searchParams.get('status'); // 'active', 'resolved'
        const type = url.searchParams.get('type');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Get or generate alerts for this device
        if (!alertsStore.has(deviceId)) {
            alertsStore.set(deviceId, generateMockAlerts(deviceId));
        }

        let alerts = alertsStore.get(deviceId) || [];

        // Apply filters
        if (severity) {
            alerts = alerts.filter(alert => alert.severity === severity);
        }

        if (status === 'active') {
            alerts = alerts.filter(alert => !alert.resolved);
        } else if (status === 'resolved') {
            alerts = alerts.filter(alert => alert.resolved);
        }

        if (type) {
            alerts = alerts.filter(alert => alert.type === type);
        }

        // Sort by creation date (newest first)
        alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Apply pagination
        const total = alerts.length;
        const paginatedAlerts = alerts.slice(offset, offset + limit);

        // Calculate statistics
        const stats = {
            total: alertsStore.get(deviceId)?.length || 0,
            active: alertsStore.get(deviceId)?.filter(a => !a.resolved).length || 0,
            resolved: alertsStore.get(deviceId)?.filter(a => a.resolved).length || 0,
            critical: alertsStore.get(deviceId)?.filter(a => a.severity === 'CRITICAL' && !a.resolved).length || 0,
            bySeverity: {
                INFO: alertsStore.get(deviceId)?.filter(a => a.severity === 'INFO').length || 0,
                WARNING: alertsStore.get(deviceId)?.filter(a => a.severity === 'WARNING').length || 0,
                ERROR: alertsStore.get(deviceId)?.filter(a => a.severity === 'ERROR').length || 0,
                CRITICAL: alertsStore.get(deviceId)?.filter(a => a.severity === 'CRITICAL').length || 0,
            }
        };

        return NextResponse.json({
            alerts: paginatedAlerts,
            total,
            limit,
            offset,
            stats
        });

    } catch (error) {
        console.error('Error fetching device alerts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch device alerts' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const deviceId = params.id;
        const body = await request.json();

        // Validate required fields
        const requiredFields = ['type', 'severity', 'title', 'message'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Create new alert
        const newAlert: Alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            deviceId,
            type: body.type,
            severity: body.severity,
            title: body.title,
            message: body.message,
            source: body.source,
            resolved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: body.metadata || {}
        };

        // Add to storage
        if (!alertsStore.has(deviceId)) {
            alertsStore.set(deviceId, []);
        }
        alertsStore.get(deviceId)!.unshift(newAlert);

        // Limit to 1000 alerts per device to prevent memory issues
        const alerts = alertsStore.get(deviceId)!;
        if (alerts.length > 1000) {
            alertsStore.set(deviceId, alerts.slice(0, 1000));
        }

        return NextResponse.json(newAlert, { status: 201 });

    } catch (error) {
        console.error('Error creating alert:', error);
        return NextResponse.json(
            { error: 'Failed to create alert' },
            { status: 500 }
        );
    }
}