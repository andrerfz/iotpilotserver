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
const objR = (properties: Record<string, unknown>, required: string[]): JsonSchema => ({type: 'object', properties, required});
const boolStr = {type: 'string', enum: ['true', 'false']};
const arr = (items: unknown): JsonSchema => ({type: 'array', items});

export const RESPONSE_SCHEMAS: Record<string, JsonSchema> = {
    User: obj({
        id: str, email: {type: 'string', format: 'email'}, username: str,
        role: {type: 'string', enum: ['USER', 'ADMIN', 'SUPERADMIN', 'READONLY']},
        customerId: strN, createdAt: dt,
        _count: obj({devices: int, alerts: int}),
    }),
    Session: obj({id: str, createdAt: dt, expiresAt: dt, isCurrent: bool}),
    InvitedUser: objR({
        id: str, email: {type: 'string', format: 'email'},
        role: {type: 'string', enum: ['ADMIN', 'USER', 'READONLY']},
        status: {type: 'string', enum: ['PENDING']},
    }, ['id', 'email', 'role', 'status']),
    AcceptInviteResult: objR({message: str, email: {type: 'string', format: 'email'}}, ['message', 'email']),
    ResendInviteResult: objR({email: {type: 'string', format: 'email'}}, ['email']),
    // Auth payload (the `data` of the envelope) — FE reads res.data.user/token.
    AuthData: obj({
        user: ref('User'), token: str,
        requiresTwoFactor: bool, userId: str, message: str,
    }),
    MeData: obj({user: ref('User')}),
    RegisterData: obj({requiresApproval: bool, isNewCompany: bool, message: str, user: ref('User')}),
    RevokeSessionResult: obj({wasCurrentSession: bool}),
    RevokeSessionsResult: obj({revokedCount: int}),
    Device: obj({
        id: str, deviceId: str, hostname: str, name: str, deviceType: str, deviceModel: strN,
        status: {type: 'string', enum: ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR', 'UNCLAIMED']},
        rawStatus: {type: 'string', enum: ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR', 'UNCLAIMED'], nullable: true},
        ipAddress: strN, tailscaleIp: strN, macAddress: strN, location: strN, agentVersion: strN,
        customerId: str, lastSeen: dtN, architecture: strN, description: strN,
        cpuUsage: numN, cpuTemp: numN, memoryUsage: numN, memoryTotal: numN, diskUsage: numN,
        diskTotal: strN, loadAverage: strN, appStatus: strN, lastBoot: dtN, registeredAt: dtN,
        temperature: numN, batteryLevel: numN, signalStrength: numN,
        connectionQuality: {type: 'string', enum: ['good', 'fair', 'poor', 'disconnected'], nullable: true},
        updatedAt: dtN, alertsCount: {type: 'integer', nullable: true},
    }),
    Alert: obj({
        id: str, deviceId: str,
        type: {type: 'string', enum: ['HIGH_CPU', 'HIGH_MEMORY', 'HIGH_TEMPERATURE', 'DISK_SPACE', 'DEVICE_OFFLINE', 'SECURITY_ALERT', 'CUSTOM']},
        severity: {type: 'string', enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL']},
        title: str, message: str, resolved: bool, resolvedAt: dtN, acknowledgedAt: dtN, createdAt: dt,
        metadata: {type: 'object', additionalProperties: true},
    }),
    ClaimResult: obj({deviceId: str, claimingToken: str, expiresAt: dt, instructions: str}),
    ApiKey: obj({id: str, name: str, createdAt: dt, lastUsedAt: dtN, expiresAt: dtN}),
    ApiKeyCreated: obj({id: str, name: str, key: str, createdAt: dt, expiresAt: dtN}),
    DeviceCommand: obj({
        id: str, command: {type: 'string', enum: ['REBOOT', 'SHUTDOWN', 'UPDATE', 'RESTART', 'CUSTOM']},
        arguments: strN, status: {type: 'string', enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT']},
        output: strN, error: strN, exitCode: {type: 'integer', nullable: true}, createdAt: dt, executedAt: dtN,
    }),
    DeviceSettings: obj({
        hostname: str, location: strN, description: strN, tags: arr(str),
        reportingInterval: int, heartbeatInterval: int, metricsEnabled: bool,
        cpuThreshold: num, memoryThreshold: num, temperatureThreshold: num, diskThreshold: num,
        sensorTempThreshold: num, batteryThreshold: num, networkMonitoring: bool, autoUpdate: bool,
        updateChannel: {type: 'string', enum: ['stable', 'beta', 'nightly']}, sshEnabled: bool, apiKeyRotationDays: int,
    }),
    DeviceStatusInfo: obj({status: str, lastSeen: dtN, uptime: numN}),
    RotateKeyResult: obj({message: str, apiKey: str, deviceId: str, rotatedAt: dt}),
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
    AuditLogEntry: obj({
        id: str, eventType: str, userId: str, customerId: strN, resource: str, action: str,
        success: bool, errorMessage: strN, timestamp: dt,
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
    ProfileSettings: objR({
        language: str,
        firstName: str, lastName: str, phoneNumber: str,
    }, ['language']),
    ProfileSettingsResponse: objR({
        language: str,
        firstName: str, lastName: str, phoneNumber: str,
        email: {type: 'string', format: 'email'}, username: str,
    }, ['language']),
    SecuritySettings: objR({twoFactorAuth: boolStr, loginNotifications: boolStr, sessionTimeout: str},
        ['twoFactorAuth', 'loginNotifications', 'sessionTimeout']),
    SystemSettings: obj({
        theme: {type: 'string', enum: ['light', 'dark', 'system']},
        isAdmin: str,
        logLevel: {type: 'string', enum: ['debug', 'info', 'warn', 'error']},
    }),
    NotificationSettings: objR({
        emailNotifications: boolStr, pushNotifications: boolStr, alertNotifications: boolStr, deviceOfflineNotifications: boolStr,
    }, ['emailNotifications', 'pushNotifications', 'alertNotifications', 'deviceOfflineNotifications']),
    OrganizationProfile: objR({
        id: str, name: str, slug: str, domain: strN, contactEmail: strN, description: strN,
        status: {type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']}, createdAt: dt,
        alertDedupEnabled: bool,
    }, ['id', 'name', 'slug', 'status', 'createdAt', 'alertDedupEnabled']),
    ChangePasswordResult: obj({message: str, wasCurrentSession: bool}),
    AdminStats: obj({
        totalDevices: int, onlineDevices: int, totalUsers: int, totalCustomers: int, openAlerts: int,
    }),
    SystemInfo: obj({
        system: obj({
            platform: str, nodeVersion: str, uptime: num,
            memoryUsage: obj({used: num, total: num, percentage: num}),
            cpuUsage: num,
        }),
        database: obj({
            status: str, version: str,
            connections: obj({active: int, idle: int, max: int}),
            size: str,
        }),
        application: obj({
            version: str, environment: str, buildDate: dt,
            features: arr(obj({name: str, enabled: bool})),
        }),
        recentActivity: arr(obj({id: str, type: str, description: str, timestamp: dt})),
    }),
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
