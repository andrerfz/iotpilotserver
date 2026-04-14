import {OpenAPIRegistry} from '@asteasolutions/zod-to-openapi';

/**
 * Singleton OpenAPI registry — all API schemas register here.
 * Uses registry.register() instead of .openapi() to avoid webpack zod instance issues.
 */
export const registry = new OpenAPIRegistry();
