import {NextRequest} from 'next/server';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

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
            return ApiResponse.notFound('Alert not found');
        }

        return ApiResponse.ok(alert);

    } catch (error) {
        console.error('Error fetching alert:', error);
        return ApiResponse.internalError('Failed to fetch alert');
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
            return ApiResponse.notFound('Alert not found');
        }

        const alert = alerts[alertIndex];

        // Handle different actions
        if (body.action === 'acknowledge') {
            if (alert.resolved) {
                return ApiResponse.badRequest('Cannot acknowledge a resolved alert');
            }

            alert.acknowledgedAt = new Date().toISOString();
            alert.updatedAt = new Date().toISOString();

        } else if (body.action === 'resolve') {
            if (alert.resolved) {
                return ApiResponse.badRequest('Alert is already resolved');
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
            return ApiResponse.badRequest('Invalid action. Supported actions: acknowledge, resolve, update');
        }

        // Update the alert in storage
        alerts[alertIndex] = alert;
        alertsStore.set(deviceId, alerts);

        return ApiResponse.ok(alert);

    } catch (error) {
        console.error('Error updating alert:', error);
        return ApiResponse.internalError('Failed to update alert');
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
            return ApiResponse.notFound('Alert not found');
        }

        // Remove the alert
        alerts.splice(alertIndex, 1);
        alertsStore.set(deviceId, alerts);

        return ApiResponse.ok({ message: 'Alert deleted successfully' });

    } catch (error) {
        console.error('Error deleting alert:', error);
        return ApiResponse.internalError('Failed to delete alert');
    }
}