import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';

/**
 * Manually build OpenAPI spec from zod schemas.
 * We avoid @asteasolutions/zod-to-openapi because webpack bundles
 * multiple zod instances, breaking the .openapi() extension method.
 */

function schemaRef(name: string) {
    return {'$ref': `#/components/schemas/${name}`};
}

function zodToSchema(schema: z.ZodTypeAny): Record<string, unknown> {
    const jsonSchema: any = zodToJsonSchema(schema as any, {target: 'openApi3'});
    const {$schema, ...rest} = jsonSchema;
    return rest;
}

export function generateOpenApiSpec() {
    // Lazy import to avoid build-time side effects
    const common = require('@iotpilot/core/shared/infrastructure/dto/common.schemas');
    const device = require('@iotpilot/core/device/infrastructure/dto/device.schemas');
    const user = require('@iotpilot/core/user/infrastructure/dto/user.schemas');
    const alert = require('@iotpilot/core/monitoring/infrastructure/dto/alert.schemas');

    return {
        openapi: '3.0.0',
        info: {
            title: 'IoT Pilot API',
            version: '1.0.0',
            description: 'IoT device management platform API. Manages device provisioning, sensor data, alerts, and multi-tenant operations.',
        },
        servers: [{url: '/api', description: 'Current server'}],
        components: {
            securitySchemes: {
                bearerAuth: {type: 'http', scheme: 'bearer', bearerFormat: 'JWT'},
                apiKeyAuth: {type: 'apiKey', in: 'header', name: 'x-api-key'},
            },
            schemas: {
                DeviceStatus: zodToSchema(common.DeviceStatusEnum),
                DeviceType: zodToSchema(common.DeviceTypeEnum),
                UserRole: zodToSchema(common.UserRoleEnum),
                AlertSeverity: zodToSchema(common.AlertSeverityEnum),
                AlertType: zodToSchema(common.AlertTypeEnum),
                PaginationParams: zodToSchema(common.PaginationParamsSchema),
                DeviceResponse: zodToSchema(device.DeviceResponseSchema),
                ClaimDeviceInput: zodToSchema(device.ClaimDeviceInputSchema),
                ClaimDeviceResponse: zodToSchema(device.ClaimDeviceResponseSchema),
                ActivateDeviceInput: zodToSchema(device.ActivateDeviceInputSchema),
                ActivateDeviceResponse: zodToSchema(device.ActivateDeviceResponseSchema),
                SensorReading: zodToSchema(device.SensorReadingSchema),
                TemperatureWebhookInput: zodToSchema(device.TemperatureWebhookInputSchema),
                TemperatureWebhookResponse: zodToSchema(device.TemperatureWebhookResponseSchema),
                PreregisterDevicesInput: zodToSchema(device.PreregisterDevicesInputSchema),
                PreregisterDevicesResponse: zodToSchema(device.PreregisterDevicesResponseSchema),
                LoginInput: zodToSchema(user.LoginInputSchema),
                RegisterInput: zodToSchema(user.RegisterInputSchema),
                UserResponse: zodToSchema(user.UserResponseSchema),
                LoginResponse: zodToSchema(user.LoginResponseSchema),
                AlertResponse: zodToSchema(alert.AlertResponseSchema),
                CreateAlertInput: zodToSchema(alert.CreateAlertInputSchema),
            },
        },
        paths: {
            '/auth/login': {
                post: {
                    summary: 'Authenticate user',
                    tags: ['Auth'],
                    requestBody: {content: {'application/json': {schema: schemaRef('LoginInput')}}},
                    responses: {200: {description: 'Login successful', content: {'application/json': {schema: schemaRef('LoginResponse')}}}},
                },
            },
            '/auth/register': {
                post: {
                    summary: 'Register new user',
                    tags: ['Auth'],
                    requestBody: {content: {'application/json': {schema: schemaRef('RegisterInput')}}},
                    responses: {200: {description: 'Registration successful', content: {'application/json': {schema: schemaRef('LoginResponse')}}}},
                },
            },
            '/auth/me': {
                get: {
                    summary: 'Get current user',
                    tags: ['Auth'],
                    security: [{bearerAuth: []}],
                    responses: {200: {description: 'Current user', content: {'application/json': {schema: schemaRef('UserResponse')}}}},
                },
            },
            '/devices/claim': {
                post: {
                    summary: 'Claim an UNCLAIMED device',
                    tags: ['Devices'],
                    security: [{bearerAuth: []}],
                    requestBody: {content: {'application/json': {schema: schemaRef('ClaimDeviceInput')}}},
                    responses: {200: {description: 'Device claimed', content: {'application/json': {schema: schemaRef('ClaimDeviceResponse')}}}},
                },
            },
            '/devices/activate': {
                post: {
                    summary: 'Activate a claimed device (called by firmware)',
                    tags: ['Devices'],
                    requestBody: {content: {'application/json': {schema: schemaRef('ActivateDeviceInput')}}},
                    responses: {200: {description: 'Device activated', content: {'application/json': {schema: schemaRef('ActivateDeviceResponse')}}}},
                },
            },
            '/webhook/temperature': {
                post: {
                    summary: 'Receive temperature readings from sensor',
                    tags: ['Webhook'],
                    security: [{apiKeyAuth: []}],
                    requestBody: {content: {'application/json': {schema: schemaRef('TemperatureWebhookInput')}}},
                    responses: {200: {description: 'Readings stored', content: {'application/json': {schema: schemaRef('TemperatureWebhookResponse')}}}},
                },
            },
            '/admin/devices': {
                get: {
                    summary: 'List devices by status (SUPERADMIN)',
                    tags: ['Admin'],
                    security: [{bearerAuth: []}],
                    parameters: [{name: 'status', in: 'query', schema: {type: 'string'}, description: 'Filter by status'}],
                    responses: {200: {description: 'Device list', content: {'application/json': {schema: {type: 'object', properties: {devices: {type: 'array', items: schemaRef('DeviceResponse')}, total: {type: 'number'}}}}}}},
                },
                post: {
                    summary: 'Pre-register UNCLAIMED devices (SUPERADMIN)',
                    tags: ['Admin'],
                    security: [{bearerAuth: []}],
                    requestBody: {content: {'application/json': {schema: schemaRef('PreregisterDevicesInput')}}},
                    responses: {200: {description: 'Devices created', content: {'application/json': {schema: schemaRef('PreregisterDevicesResponse')}}}},
                },
            },
            '/monitoring/alerts': {
                get: {
                    summary: 'List alerts',
                    tags: ['Monitoring'],
                    security: [{bearerAuth: []}],
                    responses: {200: {description: 'Alert list', content: {'application/json': {schema: {type: 'object', properties: {alerts: {type: 'array', items: schemaRef('AlertResponse')}, total: {type: 'number'}}}}}}},
                },
            },
        },
    };
}
