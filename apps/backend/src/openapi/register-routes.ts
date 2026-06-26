/**
 * App-layer OpenAPI endpoint registration.
 *
 * Endpoint registration lives in the app layer (not packages/core) because route
 * validators live here, and core must not depend on app code (dependency points
 * app → core). Importing this module (side effect) populates the shared registry;
 * the core generator then just reads it. See docs/openapi-autogen.md (T6).
 *
 * Schemas come from two places, both fine to import here:
 *  - core DTO zod schemas (device/user/alert)
 *  - a router's own `v.*` validator (exported), via its `toJsonSchema()` (T1)
 */
import {JsonSchema, JsonSchemaSource, registry, zodToOpenApi} from '@iotpilot/core/shared/infrastructure/openapi/registry';

import * as common from '@iotpilot/core/shared/infrastructure/dto/common.schemas';
import * as device from '@iotpilot/core/device/infrastructure/dto/device.schemas';
import * as user from '@iotpilot/core/user/infrastructure/dto/user.schemas';
import * as alert from '@iotpilot/core/monitoring/infrastructure/dto/alert.schemas';

import {heartbeatSchema, iotDeviceRegistrationSchema, logsSchema} from '../routes/iot.router';
import {
    loginSchema, registrationSchema, refreshSchema, changePasswordSchema,
    createApiKeySchema, verifySchema,
} from '../routes/auth.router';
import {
    deviceRegisterSchema, activateSchema, claimDeviceSchema, bulkDeviceSchema,
    tailscaleRegisterSchema, createCommandSchema, sshCommandSchema, deviceSettingsSchema,
} from '../routes/devices.router';
import {
    createAlertSchema, alertActionSchema, createThresholdSchema, batchAlertSchema, updateThresholdSchema,
} from '../routes/monitoring.router';
import {preregisterSchema} from '../routes/admin.router';
import {
    createUserSchema, updateUserSchema, updateProfileSchema, updatePreferenceSchema, pushTokenSchema,
} from '../routes/users.router';
import {
    profileSettingsSchema, securitySettingsSchema, notificationsSettingsSchema,
} from '../routes/settings.router';

/** Normalize a schema to OpenAPI-3 JSON Schema — accepts a `v.*` Schema or raw zod. */
function toJson(schema: JsonSchemaSource | unknown): JsonSchema {
    if (typeof (schema as JsonSchemaSource).toJsonSchema === 'function') {
        return (schema as JsonSchemaSource).toJsonSchema();
    }
    return zodToOpenApi(schema);
}

const bearer = [{bearerAuth: []}];
const apiKey = [{apiKeyAuth: []}];

let done = false;

/** Idempotent; runs once on import. Exported for tests / explicit invocation. */
export function registerRoutes(): void {
    if (done) return;
    done = true;

    // ── Component schemas ───────────────────────────────────────
    const MessageResponse = registry.registerSchema('MessageResponse', toJson(common.MessageResponseSchema));
    const DeviceResponse = registry.registerSchema('DeviceResponse', toJson(device.DeviceResponseSchema));
    // Device request bodies from the route validators (single source).
    const ClaimInput = registry.registerSchema('ClaimDeviceInput', toJson(claimDeviceSchema));
    const ClaimResponse = registry.registerSchema('ClaimDeviceResponse', toJson(device.ClaimDeviceResponseSchema));
    const ActivateInput = registry.registerSchema('ActivateDeviceInput', toJson(activateSchema));
    const ActivateResponse = registry.registerSchema('ActivateDeviceResponse', toJson(device.ActivateDeviceResponseSchema));
    const DeviceRegisterInput = registry.registerSchema('DeviceRegisterInput', toJson(deviceRegisterSchema));
    const BulkDeviceInput = registry.registerSchema('BulkDeviceInput', toJson(bulkDeviceSchema));
    const TailscaleRegisterInput = registry.registerSchema('TailscaleRegisterInput', toJson(tailscaleRegisterSchema));
    const CreateCommandInput = registry.registerSchema('CreateCommandInput', toJson(createCommandSchema));
    const SshCommandInput = registry.registerSchema('SshCommandInput', toJson(sshCommandSchema));
    const DeviceSettingsInput = registry.registerSchema('DeviceSettingsInput', toJson(deviceSettingsSchema));
    const WebhookInput = registry.registerSchema('TemperatureWebhookInput', toJson(device.TemperatureWebhookInputSchema));
    const WebhookResponse = registry.registerSchema('TemperatureWebhookResponse', toJson(device.TemperatureWebhookResponseSchema));
    const PreregisterInput = registry.registerSchema('PreregisterDevicesInput', toJson(preregisterSchema));
    const PreregisterResponse = registry.registerSchema('PreregisterDevicesResponse', toJson(device.PreregisterDevicesResponseSchema));
    // Auth request bodies come from the route validators (single source); responses
    // from DTOs (routes don't define response schemas).
    const LoginInput = registry.registerSchema('LoginInput', toJson(loginSchema));
    const RegisterInput = registry.registerSchema('RegisterInput', toJson(registrationSchema));
    const RefreshInput = registry.registerSchema('RefreshInput', toJson(refreshSchema));
    const ChangePasswordInput = registry.registerSchema('ChangePasswordInput', toJson(changePasswordSchema));
    const CreateApiKeyInput = registry.registerSchema('CreateApiKeyInput', toJson(createApiKeySchema));
    const Verify2faInput = registry.registerSchema('Verify2faInput', toJson(verifySchema));
    const LoginResponse = registry.registerSchema('LoginResponse', toJson(user.LoginResponseSchema));
    const UserResponse = registry.registerSchema('UserResponse', toJson(user.UserResponseSchema));
    const AlertResponse = registry.registerSchema('AlertResponse', toJson(alert.AlertResponseSchema));
    const CreateAlertInput = registry.registerSchema('CreateAlertInput', toJson(createAlertSchema));
    const AlertActionInput = registry.registerSchema('AlertActionInput', toJson(alertActionSchema));
    const BatchAlertInput = registry.registerSchema('BatchAlertInput', toJson(batchAlertSchema));
    const CreateThresholdInput = registry.registerSchema('CreateThresholdInput', toJson(createThresholdSchema));
    const UpdateThresholdInput = registry.registerSchema('UpdateThresholdInput', toJson(updateThresholdSchema));
    const CreateUserInput = registry.registerSchema('CreateUserInput', toJson(createUserSchema));
    const UpdateUserInput = registry.registerSchema('UpdateUserInput', toJson(updateUserSchema));
    const UpdateProfileInput = registry.registerSchema('UpdateProfileInput', toJson(updateProfileSchema));
    const UpdatePreferenceInput = registry.registerSchema('UpdatePreferenceInput', toJson(updatePreferenceSchema));
    const PushTokenInput = registry.registerSchema('PushTokenInput', toJson(pushTokenSchema));
    const ProfileSettingsInput = registry.registerSchema('ProfileSettingsInput', toJson(profileSettingsSchema));
    const SecuritySettingsInput = registry.registerSchema('SecuritySettingsInput', toJson(securitySettingsSchema));
    const NotificationsSettingsInput = registry.registerSchema('NotificationsSettingsInput', toJson(notificationsSettingsSchema));
    // From the router's own validators (T1: v.* → toJsonSchema())
    const HeartbeatInput = registry.registerSchema('HeartbeatInput', toJson(heartbeatSchema));
    const IotRegisterInput = registry.registerSchema('IotRegisterInput', toJson(iotDeviceRegistrationSchema));
    const IotLogsInput = registry.registerSchema('IotLogsInput', toJson(logsSchema));

    const idParam = {name: 'id', in: 'path' as const, schema: {type: 'string'}, description: 'Device public ID'};
    const pagination = [
        {name: 'page', in: 'query' as const, schema: {type: 'integer', minimum: 1}, description: 'Page number'},
        {name: 'limit', in: 'query' as const, schema: {type: 'integer', minimum: 1, maximum: 100}, description: 'Page size'},
    ];

    // ── System ──────────────────────────────────────────────────
    registry.registerPath({method: 'get', path: '/health', summary: 'Health check', tags: ['System'],
        envelope: 'none', responseDescription: 'Service health'});
    registry.registerPath({method: 'get', path: '/schedule', summary: 'Reporting schedule for the caller’s devices', tags: ['System'],
        responseDescription: 'Schedule'});

    // ── Auth ────────────────────────────────────────────────────
    registry.registerPath({method: 'post', path: '/auth/login', summary: 'Authenticate user', tags: ['Auth'],
        request: LoginInput, response: LoginResponse, responseDescription: 'Login successful'});
    registry.registerPath({method: 'post', path: '/auth/register', summary: 'Register new user', tags: ['Auth'],
        request: RegisterInput, response: LoginResponse, status: 201, responseDescription: 'Registration successful'});
    registry.registerPath({method: 'post', path: '/auth/logout', summary: 'Log out (clear session cookie)', tags: ['Auth'],
        response: MessageResponse, responseDescription: 'Logged out'});
    registry.registerPath({method: 'get', path: '/auth/me', summary: 'Get current user', tags: ['Auth'],
        security: bearer, response: UserResponse, responseDescription: 'Current user'});
    registry.registerPath({method: 'post', path: '/auth/refresh', summary: 'Refresh the access token', tags: ['Auth'],
        request: RefreshInput, response: LoginResponse, responseDescription: 'Token refreshed'});
    registry.registerPath({method: 'get', path: '/auth/session', summary: 'Get current session info', tags: ['Auth'],
        responseDescription: 'Session info'});
    registry.registerPath({method: 'get', path: '/auth/sessions', summary: 'List active sessions', tags: ['Auth'],
        security: bearer, responseDescription: 'Active sessions'});
    registry.registerPath({method: 'delete', path: '/auth/sessions', summary: 'Revoke all other sessions', tags: ['Auth'],
        security: bearer, response: MessageResponse, responseDescription: 'Sessions revoked'});
    registry.registerPath({method: 'delete', path: '/auth/sessions/{id}', summary: 'Revoke a session', tags: ['Auth'],
        security: bearer, params: [{name: 'id', in: 'path', schema: {type: 'string'}, description: 'Session ID'}],
        response: MessageResponse, responseDescription: 'Session revoked'});
    registry.registerPath({method: 'put', path: '/auth/password', summary: 'Change password', tags: ['Auth'],
        security: bearer, request: ChangePasswordInput, response: MessageResponse, responseDescription: 'Password changed'});
    registry.registerPath({method: 'post', path: '/auth/api-keys', summary: 'Create an API key', tags: ['Auth'],
        security: bearer, request: CreateApiKeyInput, status: 201, responseDescription: 'API key created'});
    registry.registerPath({method: 'get', path: '/auth/api-keys', summary: 'List API keys', tags: ['Auth'],
        security: bearer, responseDescription: 'API keys'});
    registry.registerPath({method: 'delete', path: '/auth/api-keys', summary: 'Revoke an API key', tags: ['Auth'],
        security: bearer, response: MessageResponse, responseDescription: 'API key revoked'});
    registry.registerPath({method: 'post', path: '/auth/verify-2fa', summary: 'Verify a 2FA code', tags: ['Auth'],
        request: Verify2faInput, response: LoginResponse, responseDescription: '2FA verified'});

    // ── Devices ─────────────────────────────────────────────────
    const alertId = {name: 'alertId', in: 'path' as const, schema: {type: 'string'}, description: 'Alert ID'};
    const commandId = {name: 'commandId', in: 'path' as const, schema: {type: 'string'}, description: 'Command ID'};

    registry.registerPath({method: 'get', path: '/devices', summary: 'List devices', tags: ['Devices'],
        security: bearer, params: pagination, response: DeviceResponse, envelope: 'paginated', responseDescription: 'Device list'});
    registry.registerPath({method: 'post', path: '/devices', summary: 'Provision/create a device', tags: ['Devices'],
        security: bearer, request: DeviceRegisterInput, response: DeviceResponse, status: 201, responseDescription: 'Device created'});
    registry.registerPath({method: 'post', path: '/devices/register', summary: 'Register a device', tags: ['Devices'],
        security: bearer, request: DeviceRegisterInput, response: DeviceResponse, status: 201, responseDescription: 'Device registered'});
    registry.registerPath({method: 'post', path: '/devices/activate', summary: 'Activate a claimed device (firmware)', tags: ['Devices'],
        request: ActivateInput, response: ActivateResponse, responseDescription: 'Device activated'});
    registry.registerPath({method: 'post', path: '/devices/claim', summary: 'Claim an UNCLAIMED device', tags: ['Devices'],
        security: bearer, request: ClaimInput, response: ClaimResponse, responseDescription: 'Device claimed'});
    registry.registerPath({method: 'post', path: '/devices/bulk', summary: 'Bulk device operation', tags: ['Devices'],
        security: bearer, request: BulkDeviceInput, responseDescription: 'Bulk operation result'});
    registry.registerPath({method: 'post', path: '/devices/tailscale-register', summary: 'Register a device via Tailscale', tags: ['Devices'],
        security: bearer, request: TailscaleRegisterInput, response: DeviceResponse, status: 201, responseDescription: 'Device registered'});
    registry.registerPath({method: 'get', path: '/devices/{id}', summary: 'Get a device', tags: ['Devices'],
        security: bearer, params: [idParam], response: DeviceResponse, responseDescription: 'Device'});
    registry.registerPath({method: 'put', path: '/devices/{id}', summary: 'Update a device', tags: ['Devices'],
        security: bearer, params: [idParam], request: DeviceSettingsInput, response: DeviceResponse, responseDescription: 'Device updated'});
    registry.registerPath({method: 'delete', path: '/devices/{id}', summary: 'Delete a device', tags: ['Devices'],
        security: bearer, params: [idParam], response: MessageResponse, responseDescription: 'Device deleted'});

    // Device sub-resources
    registry.registerPath({method: 'get', path: '/devices/{id}/alerts', summary: 'List a device’s alerts', tags: ['Devices'],
        security: bearer, params: [idParam, ...pagination], response: AlertResponse, envelope: 'paginated', responseDescription: 'Alerts'});
    registry.registerPath({method: 'post', path: '/devices/{id}/alerts', summary: 'Create an alert for a device', tags: ['Devices'],
        security: bearer, params: [idParam], request: CreateAlertInput, response: AlertResponse, status: 201, responseDescription: 'Alert created'});
    registry.registerPath({method: 'get', path: '/devices/{id}/alerts/{alertId}', summary: 'Get a device alert', tags: ['Devices'],
        security: bearer, params: [idParam, alertId], response: AlertResponse, responseDescription: 'Alert'});
    registry.registerPath({method: 'patch', path: '/devices/{id}/alerts/{alertId}', summary: 'Update/resolve a device alert', tags: ['Devices'],
        security: bearer, params: [idParam, alertId], response: AlertResponse, responseDescription: 'Alert updated'});
    registry.registerPath({method: 'delete', path: '/devices/{id}/alerts/{alertId}', summary: 'Delete a device alert', tags: ['Devices'],
        security: bearer, params: [idParam, alertId], response: MessageResponse, responseDescription: 'Alert deleted'});
    registry.registerPath({method: 'get', path: '/devices/{id}/commands', summary: 'List device commands', tags: ['Devices'],
        security: bearer, params: [idParam], responseDescription: 'Commands'});
    registry.registerPath({method: 'post', path: '/devices/{id}/commands', summary: 'Queue a command for a device', tags: ['Devices'],
        security: bearer, params: [idParam], request: CreateCommandInput, status: 201, responseDescription: 'Command queued'});
    registry.registerPath({method: 'get', path: '/devices/{id}/commands/{commandId}', summary: 'Get a device command', tags: ['Devices'],
        security: bearer, params: [idParam, commandId], responseDescription: 'Command'});
    registry.registerPath({method: 'get', path: '/devices/{id}/logs', summary: 'Get device logs', tags: ['Devices'],
        security: bearer, params: [idParam], responseDescription: 'Logs'});
    registry.registerPath({method: 'get', path: '/devices/{id}/metrics', summary: 'Get device metrics', tags: ['Devices'],
        security: bearer, params: [idParam], responseDescription: 'Metrics'});
    registry.registerPath({method: 'get', path: '/devices/{id}/settings', summary: 'Get device settings', tags: ['Devices'],
        security: bearer, params: [idParam], responseDescription: 'Settings'});
    registry.registerPath({method: 'put', path: '/devices/{id}/settings', summary: 'Update device settings (incl. alert thresholds)', tags: ['Devices'],
        security: bearer, params: [idParam], request: DeviceSettingsInput, responseDescription: 'Settings updated'});
    registry.registerPath({method: 'post', path: '/devices/{id}/ssh', summary: 'Run an SSH command on a device', tags: ['Devices'],
        security: bearer, params: [idParam], request: SshCommandInput, responseDescription: 'Command output'});
    registry.registerPath({method: 'get', path: '/devices/{id}/status', summary: 'Get device status', tags: ['Devices'],
        security: bearer, params: [idParam], responseDescription: 'Status'});
    registry.registerPath({method: 'post', path: '/devices/{id}/rotate-key', summary: 'Rotate a device’s API key', tags: ['Devices'],
        security: bearer, params: [idParam], responseDescription: 'Key rotated'});
    registry.registerPath({method: 'post', path: '/devices/{id}/request-ota', summary: 'Request an OTA firmware update', tags: ['Devices'],
        security: bearer, params: [idParam], response: MessageResponse, responseDescription: 'OTA requested'});

    // ── IoT / webhook ───────────────────────────────────────────
    registry.registerPath({method: 'post', path: '/webhook/temperature', summary: 'ESP32/ESP8266 sensor reading webhook', tags: ['IoT'],
        security: apiKey, request: WebhookInput, response: WebhookResponse, responseDescription: 'Sensor reading recorded'});
    registry.registerPath({method: 'post', path: '/iot/temperature', summary: 'Sensor reading webhook (alias of /webhook/temperature)', tags: ['IoT'],
        security: apiKey, request: WebhookInput, response: WebhookResponse, responseDescription: 'Sensor reading recorded'});
    registry.registerPath({method: 'post', path: '/iot/heartbeat', summary: 'Device heartbeat (status + pending commands)', tags: ['IoT'],
        security: apiKey, request: HeartbeatInput, responseDescription: 'Heartbeat accepted'});
    registry.registerPath({method: 'post', path: '/iot/register', summary: 'Self-registration by firmware', tags: ['IoT'],
        security: apiKey, request: IotRegisterInput, responseDescription: 'Device registered'});
    registry.registerPath({method: 'post', path: '/iot/logs', summary: 'Device agent log shipping (batch)', tags: ['IoT'],
        security: apiKey, request: IotLogsInput, status: 201, responseDescription: 'Logs accepted'});

    // ── Admin ───────────────────────────────────────────────────
    registry.registerPath({method: 'get', path: '/admin/devices', summary: 'List devices by status (SUPERADMIN)', tags: ['Admin'],
        security: bearer, params: [{name: 'status', in: 'query', schema: {type: 'string'}, description: 'Filter by status'}],
        response: DeviceResponse, envelope: 'paginated', responseDescription: 'Device list'});
    registry.registerPath({method: 'post', path: '/admin/devices', summary: 'Pre-register UNCLAIMED devices (SUPERADMIN)', tags: ['Admin'],
        security: bearer, request: PreregisterInput, response: PreregisterResponse, status: 201, responseDescription: 'Devices created'});

    // ── Monitoring ──────────────────────────────────────────────
    registry.registerPath({method: 'get', path: '/monitoring/alerts', summary: 'List alerts', tags: ['Monitoring'],
        security: bearer, params: pagination, response: AlertResponse, envelope: 'paginated', responseDescription: 'Alert list'});
    registry.registerPath({method: 'post', path: '/monitoring/alerts', summary: 'Create an alert', tags: ['Monitoring'],
        security: bearer, request: CreateAlertInput, response: AlertResponse, status: 201, responseDescription: 'Alert created'});
    registry.registerPath({method: 'get', path: '/monitoring/alerts/trend', summary: 'Alert trend over time', tags: ['Monitoring'],
        security: bearer, responseDescription: 'Trend data'});
    registry.registerPath({method: 'put', path: '/monitoring/alerts/batch', summary: 'Batch alert action', tags: ['Monitoring'],
        security: bearer, request: BatchAlertInput, responseDescription: 'Batch applied'});
    registry.registerPath({method: 'get', path: '/monitoring/alerts/{id}', summary: 'Get an alert', tags: ['Monitoring'],
        security: bearer, params: [idParam], response: AlertResponse, responseDescription: 'Alert'});
    registry.registerPath({method: 'put', path: '/monitoring/alerts/{id}', summary: 'Update/resolve an alert', tags: ['Monitoring'],
        security: bearer, params: [idParam], request: AlertActionInput, response: AlertResponse, responseDescription: 'Alert updated'});
    registry.registerPath({method: 'delete', path: '/monitoring/alerts/{id}', summary: 'Delete an alert', tags: ['Monitoring'],
        security: bearer, params: [idParam], response: MessageResponse, responseDescription: 'Alert deleted'});
    registry.registerPath({method: 'get', path: '/monitoring/metrics', summary: 'Aggregate metrics', tags: ['Monitoring'],
        security: bearer, responseDescription: 'Metrics'});
    registry.registerPath({method: 'get', path: '/monitoring/reports', summary: 'Monitoring reports', tags: ['Monitoring'],
        security: bearer, responseDescription: 'Reports'});
    registry.registerPath({method: 'get', path: '/monitoring/thresholds', summary: 'List thresholds', tags: ['Monitoring'],
        security: bearer, responseDescription: 'Thresholds'});
    registry.registerPath({method: 'post', path: '/monitoring/thresholds', summary: 'Create a threshold', tags: ['Monitoring'],
        security: bearer, request: CreateThresholdInput, status: 201, responseDescription: 'Threshold created'});
    registry.registerPath({method: 'put', path: '/monitoring/thresholds/{id}', summary: 'Update a threshold', tags: ['Monitoring'],
        security: bearer, params: [idParam], request: UpdateThresholdInput, responseDescription: 'Threshold updated'});
    registry.registerPath({method: 'delete', path: '/monitoring/thresholds/{id}', summary: 'Delete a threshold', tags: ['Monitoring'],
        security: bearer, params: [idParam], response: MessageResponse, responseDescription: 'Threshold deleted'});

    // ── Admin ───────────────────────────────────────────────────
    registry.registerPath({method: 'get', path: '/admin/users', summary: 'List users (SUPERADMIN)', tags: ['Admin'],
        security: bearer, responseDescription: 'Users'});
    registry.registerPath({method: 'post', path: '/admin/users/{id}/approve', summary: 'Approve a pending user', tags: ['Admin'],
        security: bearer, params: [idParam], responseDescription: 'User approved'});
    registry.registerPath({method: 'get', path: '/admin/logs', summary: 'System logs', tags: ['Admin'],
        security: bearer, responseDescription: 'Logs'});
    registry.registerPath({method: 'get', path: '/admin/system', summary: 'System info', tags: ['Admin'],
        security: bearer, responseDescription: 'System info'});
    registry.registerPath({method: 'get', path: '/admin/stats', summary: 'Platform stats', tags: ['Admin'],
        security: bearer, responseDescription: 'Stats'});
    registry.registerPath({method: 'get', path: '/admin/customers', summary: 'List customers/tenants', tags: ['Admin'],
        security: bearer, responseDescription: 'Customers'});
    registry.registerPath({method: 'post', path: '/admin/customers', summary: 'Create a customer/tenant', tags: ['Admin'],
        security: bearer, status: 201, responseDescription: 'Customer created'});
    registry.registerPath({method: 'patch', path: '/admin/customers/{id}', summary: 'Update a customer/tenant', tags: ['Admin'],
        security: bearer, params: [idParam], responseDescription: 'Customer updated'});
    registry.registerPath({method: 'delete', path: '/admin/customers/{id}', summary: 'Delete a customer/tenant', tags: ['Admin'],
        security: bearer, params: [idParam], responseDescription: 'Customer deleted'});

    // ── Users ───────────────────────────────────────────────────
    registry.registerPath({method: 'get', path: '/users', summary: 'List users', tags: ['Users'],
        security: bearer, params: pagination, response: UserResponse, envelope: 'paginated', responseDescription: 'Users'});
    registry.registerPath({method: 'post', path: '/users', summary: 'Create a user', tags: ['Users'],
        security: bearer, request: CreateUserInput, response: UserResponse, status: 201, responseDescription: 'User created'});
    registry.registerPath({method: 'get', path: '/users/current', summary: 'Get the current user', tags: ['Users'],
        security: bearer, response: UserResponse, responseDescription: 'Current user'});
    registry.registerPath({method: 'get', path: '/users/{id}', summary: 'Get a user', tags: ['Users'],
        security: bearer, params: [idParam], response: UserResponse, responseDescription: 'User'});
    registry.registerPath({method: 'put', path: '/users/{id}', summary: 'Update a user', tags: ['Users'],
        security: bearer, params: [idParam], request: UpdateUserInput, response: UserResponse, responseDescription: 'User updated'});
    registry.registerPath({method: 'delete', path: '/users/{id}', summary: 'Delete a user', tags: ['Users'],
        security: bearer, params: [idParam], response: MessageResponse, responseDescription: 'User deleted'});
    registry.registerPath({method: 'get', path: '/users/{id}/profile', summary: 'Get a user profile', tags: ['Users'],
        security: bearer, params: [idParam], responseDescription: 'Profile'});
    registry.registerPath({method: 'put', path: '/users/{id}/profile', summary: 'Update a user profile', tags: ['Users'],
        security: bearer, params: [idParam], request: UpdateProfileInput, responseDescription: 'Profile updated'});
    registry.registerPath({method: 'get', path: '/users/{id}/notification-preferences', summary: 'Get notification preferences', tags: ['Users'],
        security: bearer, params: [idParam], responseDescription: 'Preferences'});
    registry.registerPath({method: 'put', path: '/users/{id}/notification-preferences', summary: 'Update notification preferences', tags: ['Users'],
        security: bearer, params: [idParam], request: UpdatePreferenceInput, responseDescription: 'Preferences updated'});
    registry.registerPath({method: 'post', path: '/users/me/push-token', summary: 'Register a push token', tags: ['Users'],
        security: bearer, request: PushTokenInput, responseDescription: 'Token registered'});
    registry.registerPath({method: 'delete', path: '/users/me/push-token', summary: 'Remove a push token', tags: ['Users'],
        security: bearer, response: MessageResponse, responseDescription: 'Token removed'});

    // ── Settings ────────────────────────────────────────────────
    registry.registerPath({method: 'get', path: '/settings', summary: 'Get all settings', tags: ['Settings'],
        security: bearer, responseDescription: 'Settings'});
    registry.registerPath({method: 'get', path: '/settings/profile', summary: 'Get profile settings', tags: ['Settings'],
        security: bearer, responseDescription: 'Profile settings'});
    registry.registerPath({method: 'put', path: '/settings/profile', summary: 'Update profile settings', tags: ['Settings'],
        security: bearer, request: ProfileSettingsInput, responseDescription: 'Updated'});
    registry.registerPath({method: 'get', path: '/settings/security', summary: 'Get security settings', tags: ['Settings'],
        security: bearer, responseDescription: 'Security settings'});
    registry.registerPath({method: 'put', path: '/settings/security', summary: 'Update security settings', tags: ['Settings'],
        security: bearer, request: SecuritySettingsInput, responseDescription: 'Updated'});
    registry.registerPath({method: 'get', path: '/settings/system', summary: 'Get system settings', tags: ['Settings'],
        security: bearer, responseDescription: 'System settings'});
    registry.registerPath({method: 'put', path: '/settings/system', summary: 'Update system settings', tags: ['Settings'],
        security: bearer, responseDescription: 'Updated'});
    registry.registerPath({method: 'get', path: '/settings/notifications', summary: 'Get notification settings', tags: ['Settings'],
        security: bearer, responseDescription: 'Notification settings'});
    registry.registerPath({method: 'put', path: '/settings/notifications', summary: 'Update notification settings', tags: ['Settings'],
        security: bearer, request: NotificationsSettingsInput, responseDescription: 'Updated'});

    // ── Notifications ───────────────────────────────────────────
    registry.registerPath({method: 'get', path: '/notifications', summary: 'List notifications', tags: ['Notifications'],
        security: bearer, params: pagination, responseDescription: 'Notifications'});
    registry.registerPath({method: 'get', path: '/notifications/{id}', summary: 'Get a notification', tags: ['Notifications'],
        security: bearer, params: [idParam], responseDescription: 'Notification'});
    registry.registerPath({method: 'delete', path: '/notifications/{id}', summary: 'Delete a notification', tags: ['Notifications'],
        security: bearer, params: [idParam], response: MessageResponse, responseDescription: 'Deleted'});
    registry.registerPath({method: 'post', path: '/notifications/{id}/retry', summary: 'Retry a failed notification', tags: ['Notifications'],
        security: bearer, params: [idParam], response: MessageResponse, responseDescription: 'Retried'});
}

// Populate the registry on import.
registerRoutes();
