import {registry} from './registry';

/**
 * Build the OpenAPI document from the registry. The registry is populated by the
 * app layer (apps/backend/src/openapi/register-routes.ts) at import time — core
 * must not depend on app routes, so registration happens there, not here.
 * See docs/openapi-autogen.md.
 */
function baseDoc(paths: Record<string, unknown>) {
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
        paths,
    };
}

/** Accurate wire contract — responses include the {success,data,timestamp} envelope. */
export function generateOpenApiSpec() {
    return baseDoc(registry.buildPaths());
}

/**
 * Codegen-facing contract for the Angular client (ng-openapi-gen): responses are
 * UNWRAPPED (the HTTP interceptor strips the envelope), so generated types match
 * how the FE consumes them. See docs/openapi-autogen.md (T9).
 */
export function generateClientSpec() {
    return baseDoc(registry.buildPaths({unwrap: true}));
}
