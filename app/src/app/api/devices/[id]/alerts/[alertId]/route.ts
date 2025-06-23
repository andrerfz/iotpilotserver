import { NextRequest, NextResponse } from 'next/server';

interface Alert {
    id: string;
    deviceId: string;
    type: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    title: string;
    message: string;
    source?: string;
    resolved: boolean;
    resolvedAt?: string;
    acknowledgedAt?: string;
    resolvedBy?: string;
    resolveNote?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}

// In-memory storage for demo purposes - shared with alerts route
const alertsStore = new Map<string, Alert[]>();

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string; alertId: string } }
) {
    try {
        const { id: deviceId, alertId } = params;

        const alerts = alertsStore.get(deviceId) || [];
        const alert = alerts.find(a => a.id === alertId);

        if (!alert) {
            return NextResponse.json(
                { error: 'Alert not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(alert);

    } catch (error) {
        console.error('Error fetching alert:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alert' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; alertId: string } }
) {
    try {
        const { id: deviceId, alertId } = params;
        const body = await request.json();

        const alerts = alertsStore.get(deviceId) || [];
        const alertIndex = alerts.findIndex(a => a.id === alertId);

        if (alertIndex === -1) {
            return NextResponse.json(
                { error: 'Alert not found' },
                { status: 404 }
            );
        }

        const alert = alerts[alertIndex];

        // Handle different actions
        if (body.action === 'acknowledge') {
            if (alert.resolved) {
                return NextResponse.json(
                    { error: 'Cannot acknowledge a resolved alert' },
                    { status: 400 }
                );
            }

            alert.acknowledgedAt = new Date().toISOString();
            alert.updatedAt = new Date().toISOString();

        } else if (body.action === 'resolve') {
            if (alert.resolved) {
                return NextResponse.json(
                    { error: 'Alert is already resolved' },
                    { status: 400 }
                );
            }

            alert.resolved = true;
            alert.resolvedAt = new Date().toISOString();
            alert.resolvedBy = body.resolvedBy || 'system';
            alert.resolveNote = body.note || '';
            alert.updatedAt = new Date().toISOString();

        } else if (body.action === 'update') {
            // Allow updating certain fields
            if (body.severity) alert.severity = body.severity;
            if (body.title) alert.title = body.title;
            if (body.message) alert.message = body.message;
            if (body.metadata) alert.metadata = { ...alert.metadata, ...body.metadata };
            alert.updatedAt = new Date().toISOString();

        } else {
            return NextResponse.json(
                { error: 'Invalid action. Supported actions: acknowledge, resolve, update' },
                { status: 400 }
            );
        }

        // Update the alert in storage
        alerts[alertIndex] = alert;
        alertsStore.set(deviceId, alerts);

        return NextResponse.json(alert);

    } catch (error) {
        console.error('Error updating alert:', error);
        return NextResponse.json(
            { error: 'Failed to update alert' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; alertId: string } }
) {
    try {
        const { id: deviceId, alertId } = params;

        const alerts = alertsStore.get(deviceId) || [];
        const alertIndex = alerts.findIndex(a => a.id === alertId);

        if (alertIndex === -1) {
            return NextResponse.json(
                { error: 'Alert not found' },
                { status: 404 }
            );
        }

        // Remove the alert
        alerts.splice(alertIndex, 1);
        alertsStore.set(deviceId, alerts);

        return NextResponse.json({ message: 'Alert deleted successfully' });

    } catch (error) {
        console.error('Error deleting alert:', error);
        return NextResponse.json(
            { error: 'Failed to delete alert' },
            { status: 500 }
        );
    }
}