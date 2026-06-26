import {registry} from './registry';
import {registerAll} from './registrations';

/**
 * Build the OpenAPI document from the registry. Endpoints/schemas are contributed
 * by registrations.ts (and, in the T6 end-state, by routers via their validators).
 * See docs/openapi-autogen.md.
 */
export function generateOpenApiSpec() {
    registerAll();

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
            schemas: registry.getSchemas(),
        },
        paths: registry.buildPaths(),
    };
}
