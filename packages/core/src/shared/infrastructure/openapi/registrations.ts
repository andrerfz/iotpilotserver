/**
 * Endpoint registrations for the OpenAPI generator.
 *
 * Central for now (uses the exported zod DTO schemas, which all live in core).
 * The end-state (T6, docs/openapi-autogen.md) is decentralized — each router
 * registers its own endpoints via its `v.*` validator's `toJsonSchema()`; the
 * `registry` already accepts that. This module covers the endpoints whose schemas
 * already exist as DTOs, with response envelopes (T3).
 */
import {ZodTypeAny} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {JsonSchema, registry} from './registry';

import * as common from '@iotpilot/core/shared/infrastructure/dto/common.schemas';
import * as device from '@iotpilot/core/device/infrastructure/dto/device.schemas';
import * as user from '@iotpilot/core/user/infrastructure/dto/user.schemas';
import * as alert from '@iotpilot/core/monitoring/infrastructure/dto/alert.schemas';

/** Convert a raw zod schema to an OpenAPI-3 JSON Schema (strips $schema). */
function j(schema: ZodTypeAny): JsonSchema {
    const {$schema, ...rest} = zodToJsonSchema(schema as any, {target: 'openApi3'}) as JsonSchema;
    return rest;
}

const bearer = [{bearerAuth: []}];
const apiKey = [{apiKeyAuth: []}];

let done = false;

/** Idempotent — safe to call on every generateOpenApiSpec(). */
export function registerAll(): void {
    if (done) return;
    done = true;

    // ── Component schemas ───────────────────────────────────────
    registry.registerSchema('DeviceStatus', j(common.DeviceStatusEnum));
    registry.registerSchema('DeviceType', j(common.DeviceTypeEnum));
    registry.registerSchema('AlertSeverity', j(common.AlertSeverityEnum));
    registry.registerSchema('AlertType', j(common.AlertTypeEnum));
    const DeviceResponse = registry.registerSchema('DeviceResponse', j(device.DeviceResponseSchema));
    const ClaimInput = registry.registerSchema('ClaimDeviceInput', j(device.ClaimDeviceInputSchema));
    const ClaimResponse = registry.registerSchema('ClaimDeviceResponse', j(device.ClaimDeviceResponseSchema));
    const ActivateInput = registry.registerSchema('ActivateDeviceInput', j(device.ActivateDeviceInputSchema));
    const ActivateResponse = registry.registerSchema('ActivateDeviceResponse', j(device.ActivateDeviceResponseSchema));
    const WebhookInput = registry.registerSchema('TemperatureWebhookInput', j(device.TemperatureWebhookInputSchema));
    const WebhookResponse = registry.registerSchema('TemperatureWebhookResponse', j(device.TemperatureWebhookResponseSchema));
    const PreregisterInput = registry.registerSchema('PreregisterDevicesInput', j(device.PreregisterDevicesInputSchema));
    const PreregisterResponse = registry.registerSchema('PreregisterDevicesResponse', j(device.PreregisterDevicesResponseSchema));
    const LoginInput = registry.registerSchema('LoginInput', j(user.LoginInputSchema));
    const LoginResponse = registry.registerSchema('LoginResponse', j(user.LoginResponseSchema));
    const RegisterInput = registry.registerSchema('RegisterInput', j(user.RegisterInputSchema));
    const UserResponse = registry.registerSchema('UserResponse', j(user.UserResponseSchema));
    const AlertResponse = registry.registerSchema('AlertResponse', j(alert.AlertResponseSchema));
    const CreateAlertInput = registry.registerSchema('CreateAlertInput', j(alert.CreateAlertInputSchema));

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
        security: bearer, params: pagination, response: DeviceResponse, envelope: 'paginated',
        responseDescription: 'Device list'});
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
