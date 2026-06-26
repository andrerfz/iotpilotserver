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
    const PreregisterInput = registry.registerSchema('PreregisterDevicesInput', toJson(device.PreregisterDevicesInputSchema));
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
    const CreateAlertInput = registry.registerSchema('CreateAlertInput', toJson(alert.CreateAlertInputSchema));
    // From the router's own validators (T1: v.* → toJsonSchema())
    const HeartbeatInput = registry.registerSchema('HeartbeatInput', toJson(heartbeatSchema));
    const IotRegisterInput = registry.registerSchema('IotRegisterInput', toJson(iotDeviceRegistrationSchema));
    const IotLogsInput = registry.registerSchema('IotLogsInput', toJson(logsSchema));

    const idParam = {name: 'id', in: 'path' as const, schema: {type: 'string'}, description: 'Device public ID'};
    const pagination = [
        {name: 'page', in: 'query' as const, schema: {type: 'integer', minimum: 1}, description: 'Page number'},
        {name: 'limit', in: 'query' as const, schema: {type: 'integer', minimum: 1, maximum: 100}, description: 'Page size'},
    ];

    // ── Auth ────────────────────────────────────────────────────
    registry.registerPath({method: 'post', path: '/auth/login', summary: 'Authenticate user', tags: ['Auth'],
        request: LoginInput, response: LoginResponse, responseDescription: 'Login successful'});
    registry.registerPath({method: 'post', path: '/auth/register', summary: 'Register new user', tags: ['Auth'],
        request: RegisterInput, response: LoginResponse, status: 201, responseDescription: 'Registration successful'});
    registry.registerPath({method: 'post', path: '/auth/logout', summary: 'Log out (clear session cookie)', tags: ['Auth'],
        responseDescription: 'Logged out'});
    registry.registerPath({method: 'get', path: '/auth/me', summary: 'Get current user', tags: ['Auth'],
        security: bearer, response: UserResponse, responseDescription: 'Current user'});
    registry.registerPath({method: 'post', path: '/auth/refresh', summary: 'Refresh the access token', tags: ['Auth'],
        request: RefreshInput, response: LoginResponse, responseDescription: 'Token refreshed'});
    registry.registerPath({method: 'get', path: '/auth/session', summary: 'Get current session info', tags: ['Auth'],
        responseDescription: 'Session info'});
    registry.registerPath({method: 'get', path: '/auth/sessions', summary: 'List active sessions', tags: ['Auth'],
        security: bearer, responseDescription: 'Active sessions'});
    registry.registerPath({method: 'delete', path: '/auth/sessions', summary: 'Revoke all other sessions', tags: ['Auth'],
        security: bearer, responseDescription: 'Sessions revoked'});
    registry.registerPath({method: 'delete', path: '/auth/sessions/{id}', summary: 'Revoke a session', tags: ['Auth'],
        security: bearer, params: [{name: 'id', in: 'path', schema: {type: 'string'}, description: 'Session ID'}],
        responseDescription: 'Session revoked'});
    registry.registerPath({method: 'put', path: '/auth/password', summary: 'Change password', tags: ['Auth'],
        security: bearer, request: ChangePasswordInput, responseDescription: 'Password changed'});
    registry.registerPath({method: 'post', path: '/auth/api-keys', summary: 'Create an API key', tags: ['Auth'],
        security: bearer, request: CreateApiKeyInput, status: 201, responseDescription: 'API key created'});
    registry.registerPath({method: 'get', path: '/auth/api-keys', summary: 'List API keys', tags: ['Auth'],
        security: bearer, responseDescription: 'API keys'});
    registry.registerPath({method: 'delete', path: '/auth/api-keys', summary: 'Revoke an API key', tags: ['Auth'],
        security: bearer, responseDescription: 'API key revoked'});
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
        security: bearer, params: [idParam], responseDescription: 'Device deleted'});

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
        security: bearer, params: [idParam, alertId], responseDescription: 'Alert deleted'});
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
        security: bearer, params: [idParam], responseDescription: 'OTA requested'});

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
}

// Populate the registry on import.
registerRoutes();
