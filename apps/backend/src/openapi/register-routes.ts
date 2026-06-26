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
    const ClaimInput = registry.registerSchema('ClaimDeviceInput', toJson(device.ClaimDeviceInputSchema));
    const ClaimResponse = registry.registerSchema('ClaimDeviceResponse', toJson(device.ClaimDeviceResponseSchema));
    const ActivateInput = registry.registerSchema('ActivateDeviceInput', toJson(device.ActivateDeviceInputSchema));
    const ActivateResponse = registry.registerSchema('ActivateDeviceResponse', toJson(device.ActivateDeviceResponseSchema));
    const WebhookInput = registry.registerSchema('TemperatureWebhookInput', toJson(device.TemperatureWebhookInputSchema));
    const WebhookResponse = registry.registerSchema('TemperatureWebhookResponse', toJson(device.TemperatureWebhookResponseSchema));
    const PreregisterInput = registry.registerSchema('PreregisterDevicesInput', toJson(device.PreregisterDevicesInputSchema));
    const PreregisterResponse = registry.registerSchema('PreregisterDevicesResponse', toJson(device.PreregisterDevicesResponseSchema));
    const LoginInput = registry.registerSchema('LoginInput', toJson(user.LoginInputSchema));
    const LoginResponse = registry.registerSchema('LoginResponse', toJson(user.LoginResponseSchema));
    const RegisterInput = registry.registerSchema('RegisterInput', toJson(user.RegisterInputSchema));
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
    registry.registerPath({method: 'get', path: '/auth/me', summary: 'Get current user', tags: ['Auth'],
        security: bearer, response: UserResponse, responseDescription: 'Current user'});

    // ── Devices ─────────────────────────────────────────────────
    registry.registerPath({method: 'get', path: '/devices', summary: 'List devices', tags: ['Devices'],
        security: bearer, params: pagination, response: DeviceResponse, envelope: 'paginated', responseDescription: 'Device list'});
    registry.registerPath({method: 'get', path: '/devices/{id}', summary: 'Get a device', tags: ['Devices'],
        security: bearer, params: [idParam], response: DeviceResponse, responseDescription: 'Device'});
    registry.registerPath({method: 'post', path: '/devices/claim', summary: 'Claim an UNCLAIMED device', tags: ['Devices'],
        security: bearer, request: ClaimInput, response: ClaimResponse, responseDescription: 'Device claimed'});
    registry.registerPath({method: 'post', path: '/devices/activate', summary: 'Activate a claimed device (firmware)', tags: ['Devices'],
        request: ActivateInput, response: ActivateResponse, responseDescription: 'Device activated'});

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
