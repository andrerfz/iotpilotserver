// app/src/app/api/monitoring/reports/route.ts
import {NextResponse} from 'next/server';
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {
    GenerateReportQuery,
    ReportFormat,
    ReportType
} from '@/lib/monitoring/application/queries/generate-report/generate-report.query';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/monitoring/reports - Generate monitoring reports using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 MONITORING REPORTS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const searchParams = new URL(request.url).searchParams;

        // Parse query parameters
        const reportType = searchParams.get('type') as ReportType || 'system';
        const startTimeParam = searchParams.get('startTime');
        const endTimeParam = searchParams.get('endTime');
        const period = searchParams.get('period') || '24h'; // Default to 24h if no explicit dates
        const deviceId = searchParams.get('deviceId');
        const metricNames = searchParams.get('metrics')?.split(',').filter(Boolean);
        const includeAlerts = searchParams.get('includeAlerts') !== 'false'; // default to true
        const includeThresholds = searchParams.get('includeThresholds') !== 'false'; // default to true
        const format = searchParams.get('format') as ReportFormat || 'json';

        console.log('📋 MONITORING REPORTS GET: Query params:', {
            reportType,
            startTime: startTimeParam,
            endTime: endTimeParam,
            period,
            deviceId,
            metricNames,
            includeAlerts,
            includeThresholds,
            format,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Validate report type
        const validReportTypes: ReportType[] = ['system', 'device', 'alerts', 'performance', 'custom'];
        if (!validReportTypes.includes(reportType)) {
            return ApiResponse.badRequest(`Invalid report type. Must be one of: ${validReportTypes.join(', ')}`);
        }

        // Validate format
        const validFormats: ReportFormat[] = ['json', 'csv', 'pdf', 'html'];
        if (!validFormats.includes(format)) {
            return ApiResponse.badRequest(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
        }

        // Calculate date range based on period or explicit dates
        let startTime: Date;
        let endTime: Date;

        if (startTimeParam && endTimeParam) {
            startTime = new Date(startTimeParam);
            endTime = new Date(endTimeParam);

            // Validate dates
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                return ApiResponse.badRequest('Invalid date format for startTime or endTime');
            }
        } else {
            // Calculate based on period
            const now = new Date();
            endTime = now;

            switch (period) {
                case '1h':
                    startTime = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '6h':
                    startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default: // 24h is default
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }
        }

        // Validate date range
        if (startTime >= endTime) {
            return ApiResponse.badRequest('Start time must be before end time');
        }

        // Validate date range is not too large (max 90 days for performance)
        const maxRangeMs = 90 * 24 * 60 * 60 * 1000; // 90 days
        if (endTime.getTime() - startTime.getTime() > maxRangeMs) {
            return ApiResponse.badRequest('Date range cannot exceed 90 days');
        }

        // Validate device-specific reports require deviceId
        if (reportType === 'device' && !deviceId) {
            return ApiResponse.badRequest('Device ID is required for device-specific reports');
        }

        // Get tenant ID - use customer ID from user context
        const tenantId = request.user?.customerId;
        if (!tenantId && request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.badRequest('Customer ID is required for report generation');
        }

        // Parse custom options from additional query parameters
        const customOptions: Record<string, any> = {};
        for (const [key, value] of searchParams.entries()) {
            if (!['type', 'startTime', 'endTime', 'period', 'deviceId', 'metrics', 
                  'includeAlerts', 'includeThresholds', 'format'].includes(key)) {
                customOptions[key] = value;
            }
        }

        // Create and execute GenerateReport query
        const generateReportQuery = GenerateReportQuery.create(
            tenantId || 'system', // Use 'system' for SUPERADMIN without specific tenant
            reportType,
            startTime,
            endTime,
            deviceId || undefined,
            metricNames,
            includeAlerts,
            includeThresholds,
            format,
            Object.keys(customOptions).length > 0 ? customOptions : undefined
        );

        const reportResult = await queryBus.execute(generateReportQuery);

        console.log('✅ MONITORING REPORTS GET: Report generated successfully:', {
            reportType,
            format,
            dataPoints: reportResult.data?.length || 0,
            duration: `${Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))}h`,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Handle different response formats
        if (format === 'json') {
            // Return JSON response with comprehensive report data
            const response = {
                report: {
                    id: reportResult.id,
                    type: reportType,
                    format,
                    timeRange: {
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                        duration: endTime.getTime() - startTime.getTime()
                    },
                    filters: {
                        deviceId: deviceId || null,
                        metricNames: metricNames || [],
                        includeAlerts,
                        includeThresholds,
                        customOptions
                    },
                    data: reportResult.data || [],
                    summary: reportResult.summary || {},
                    metadata: {
                        generatedAt: reportResult.generatedAt || new Date().toISOString(),
                        generatedBy: {
                            id: request.user!.id,
                            email: request.user!.email,
                            username: request.user!.username
                        },
                        dataPoints: reportResult.data?.length || 0,
                        processingTime: reportResult.processingTimeMs || 0
                    }
                },
                timestamp: new Date().toISOString()
            };

            return ApiResponse.ok(response);
        } else {
            // For other formats (CSV, PDF, HTML), return the generated content
            const headers = new Headers();
            
            switch (format) {
                case 'csv':
                    headers.set('Content-Type', 'text/csv');
                    headers.set('Content-Disposition', `attachment; filename="report-${reportType}-${Date.now()}.csv"`);
                    break;
                case 'pdf':
                    headers.set('Content-Type', 'application/pdf');
                    headers.set('Content-Disposition', `attachment; filename="report-${reportType}-${Date.now()}.pdf"`);
                    break;
                case 'html':
                    headers.set('Content-Type', 'text/html');
                    break;
            }

            return new NextResponse(reportResult.content || reportResult.data, {
                status: 200,
                headers
            });
        }

    } catch (error) {
        console.error('❌ MONITORING REPORTS GET: Failed to generate report with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('Tenant access violation') || error.message.includes('access denied')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('Device not found')) {
                return ApiResponse.notFound('Device not found');
            }
            if (error.message.includes('TimeRange') || error.message.includes('invalid date')) {
                return ApiResponse.badRequest('Invalid time range parameters');
            }
            if (error.message.includes('report type') || error.message.includes('format')) {
                return ApiResponse.badRequest(error.message);
            }
            if (error.message.includes('timeout') || error.message.includes('too large')) {
                return ApiResponse.error('Report generation timeout - try a smaller date range or fewer metrics', 408);
            }
        }

        return ApiResponse.internalError('Failed to generate report');
    }
}, ServiceContainer.getInstance().getQueryBus());