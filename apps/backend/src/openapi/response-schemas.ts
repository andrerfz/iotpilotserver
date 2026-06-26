/**
 * Response model schemas for the OpenAPI generator (T8).
 *
 * Responses are not validated at runtime, so these are plain JSON Schema objects
 * (no zod needed) ported from the shapes the handlers return / the legacy
 * docs/openapi.yml documents — so the generated spec carries the same response
 * types the FE client (ng-openapi-gen) needs. See docs/openapi-autogen.md.
 */
import {JsonSchema} from '@iotpilot/core/shared/infrastructure/openapi/registry';

const ref = (name: string) => ({$ref: `#/components/schemas/${name}`});
const str = {type: 'string'};
const strN = {type: 'string', nullable: true};
const num = {type: 'number'};
const numN = {type: 'number', nullable: true};
const int = {type: 'integer'};
const bool = {type: 'boolean'};
const dt = {type: 'string', format: 'date-time'};
const dtN = {type: 'string', format: 'date-time', nullable: true};
const obj = (properties: Record<string, unknown>): JsonSchema => ({type: 'object', properties});
const arr = (items: unknown): JsonSchema => ({type: 'array', items});

export const RESPONSE_SCHEMAS: Record<string, JsonSchema> = {
    User: obj({
        id: str, email: {type: 'string', format: 'email'}, username: str,
        role: {type: 'string', enum: ['USER', 'ADMIN', 'SUPERADMIN', 'READONLY']},
        customerId: strN, createdAt: dt,
        _count: obj({devices: int, alerts: int}),
    }),
    Session: obj({id: str, createdAt: dt, expiresAt: dt, isCurrent: bool}),
    AuthData: obj({user: ref('User'), token: str}),
    ApiKey: obj({id: str, name: str, createdAt: dt, lastUsedAt: dtN, expiresAt: dtN}),
    ApiKeyCreated: obj({id: str, name: str, key: str, createdAt: dt, expiresAt: dtN}),
    DeviceCommand: obj({
        id: str, command: {type: 'string', enum: ['REBOOT', 'SHUTDOWN', 'UPDATE', 'RESTART', 'CUSTOM']},
        arguments: strN, status: {type: 'string', enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT']},
        output: strN, error: strN, exitCode: {type: 'integer', nullable: true}, createdAt: dt, executedAt: dtN,
    }),
    DeviceSettings: obj({
        reportingInterval: int, heartbeatInterval: int, metricsEnabled: bool,
        cpuThreshold: num, memoryThreshold: num, temperatureThreshold: num, diskThreshold: num,
        sensorTempThreshold: num, batteryThreshold: num, networkMonitoring: bool, autoUpdate: bool,
        updateChannel: {type: 'string', enum: ['stable', 'beta', 'nightly']}, sshEnabled: bool, apiKeyRotationDays: int,
    }),
    DeviceStatusInfo: obj({status: str, lastSeen: dtN, uptime: numN}),
    RotateKeyResult: obj({apiKey: str}),
    BulkResult: obj({processed: int, succeeded: int, failed: int}),
    Threshold: obj({
        id: str, deviceId: strN, name: str, description: str, metricName: str,
        operator: {type: 'string', enum: ['GREATER_THAN', 'LESS_THAN', 'EQUAL_TO', 'NOT_EQUAL_TO', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL']},
        value: num, unit: str, severity: {type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']},
        type: {type: 'string', enum: ['STATIC', 'DYNAMIC', 'BASELINE']}, cooldownMinutes: int, isEnabled: bool, customerId: str, createdAt: dt,
    }),
    DeviceLogEntry: obj({
        id: str, deviceId: str, level: {type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']},
        message: str, source: strN, timestamp: dt,
    }),
    MetricPoint: obj({timestamp: dt, value: num, unit: str}),
    DeviceMetrics: obj({
        metrics: {type: 'object', additionalProperties: arr(ref('MetricPoint'))},
        period: str, resolution: str, total_points: int, processed_points: int,
    }),
    MonitoringMetrics: obj({
        metrics: arr(obj({metricName: str, value: num, timestamp: dt, unit: str, deviceId: strN})),
        summary: {type: 'object', additionalProperties: true},
        timeRange: obj({startTime: dt, endTime: dt, period: str}),
    }),
    AlertTrendPoint: obj({date: str, count: int, severity: str}),
    MonitoringReport: obj({generatedAt: dt, summary: {type: 'object', additionalProperties: true}}),
    SshResult: obj({output: str, error: strN}),
    NotificationRecord: obj({
        id: str, type: str, channel: {type: 'string', enum: ['EMAIL', 'SMS', 'WEBHOOK', 'SLACK', 'PUSH']},
        status: {type: 'string', enum: ['PENDING', 'SENDING', 'DELIVERED', 'FAILED', 'DEAD', 'CANCELLED']},
        recipient: str, subject: str, attemptCount: int, createdAt: dt,
    }),
    ProfileSettings: obj({
        language: str, timezone: str, dateFormat: {type: 'string', enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']},
        firstName: str, lastName: str, phoneNumber: str,
    }),
    SecuritySettings: obj({twoFactorAuth: str, sessionTimeout: str, loginNotifications: str}),
    SystemSettings: obj({
        theme: {type: 'string', enum: ['light', 'dark', 'system']},
        dashboardLayout: {type: 'string', enum: ['default', 'compact', 'expanded']},
        itemsPerPage: str, isAdmin: str, enableAdvancedMetrics: str, enableBetaFeatures: str,
        logLevel: {type: 'string', enum: ['debug', 'info', 'warn', 'error']},
    }),
    NotificationSettings: obj({
        emailNotifications: str, pushNotifications: str, alertNotifications: str, deviceOfflineNotifications: str,
    }),
    AdminStats: obj({
        totalDevices: int, onlineDevices: int, totalUsers: int, totalCustomers: int, openAlerts: int,
    }),
    SystemInfo: obj({version: str, uptime: num, environment: str}),
    Customer: obj({id: str, name: str, slug: str, createdAt: dt, deviceCount: {type: 'integer', nullable: true}}),
    HeartbeatResponse: obj({
        success: bool,
        config: obj({reportingInterval: int, heartbeatInterval: int, deepSleepEnabled: bool}),
        commands: arr(ref('DeviceCommand')),
        firmware: {type: 'object', nullable: true, properties: {targetVersion: str}},
    }),
    AllSettings: obj({
        profile: ref('ProfileSettings'), security: ref('SecuritySettings'),
        system: ref('SystemSettings'), notifications: ref('NotificationSettings'),
    }),
    HealthResponse: obj({status: str, timestamp: dt}),
    ScheduleResponse: obj({devices: arr(obj({deviceId: str, reportingInterval: int, nextReportAt: dtN}))}),
};
