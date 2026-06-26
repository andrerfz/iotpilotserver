/**
 * Self-contained OpenAPI registry. Routers (or a central registrations module)
 * register their endpoints here; the generator builds the document from it.
 *
 * Lib-agnostic by design: it stores plain JSON Schema objects. A schema source
 * can be either a raw JSON Schema or anything exposing `toJsonSchema()` — which
 * includes our `ValidationService` `Schema` abstraction (see T1 in
 * docs/openapi-autogen.md), so a route's own validator can register itself.
 *
 * We deliberately do NOT use @asteasolutions/zod-to-openapi (webpack bundles
 * multiple zod instances, breaking its `.openapi()` extension).
 */

import {zodToJsonSchema} from 'zod-to-json-schema';

export type JsonSchema = Record<string, unknown>;
type Method = 'get' | 'post' | 'put' | 'delete' | 'patch';

export interface JsonSchemaSource {
    toJsonSchema(): JsonSchema;
}

export function asJsonSchema(source: JsonSchemaSource | JsonSchema): JsonSchema {
    return typeof (source as JsonSchemaSource).toJsonSchema === 'function'
        ? (source as JsonSchemaSource).toJsonSchema()
        : (source as JsonSchema);
}

/**
 * Convert a raw zod schema to an OpenAPI-3 JSON Schema. Lives in core (which owns
 * the zod-to-json-schema dependency) so the app layer doesn't need it directly —
 * use this for DTO zod schemas, and `Schema.toJsonSchema()` for `v.*` validators.
 */
export function zodToOpenApi(zodSchema: unknown): JsonSchema {
    const {$schema, ...rest} = zodToJsonSchema(zodSchema as any, {target: 'openApi3'}) as JsonSchema;
    return rest;
}

export interface ParamDef {
    name: string;
    in: 'path' | 'query';
    required?: boolean;
    schema: JsonSchema;
    description?: string;
}

export interface OperationDef {
    method: Method;
    path: string;                 // OpenAPI path, e.g. '/devices/{id}'
    operationId?: string;         // stable name for client codegen (ng-openapi-gen)
    summary: string;
    tags: string[];
    security?: Array<Record<string, string[]>>;
    params?: ParamDef[];
    request?: { $ref: string } | JsonSchema;   // request body schema (or component ref)
    requestOptional?: boolean;    // requestBody not required (e.g. body-less refresh)
    response?: { $ref: string } | JsonSchema;  // the DATA payload, pre-envelope
    responseDescription?: string;
    /** How to wrap the response data. Default 'success'. 'none' = raw, no envelope. */
    envelope?: 'success' | 'paginated' | 'none';
    /** Keep the envelope even in the unwrapped client spec (for endpoints the FE
     *  reads via `res.data.…`). Default false. */
    clientWrap?: boolean;
    status?: number;              // default 200
}

/** Wrap a data schema in the standard `{ success, data, timestamp }` envelope. */
export function successEnvelope(dataSchema: { $ref: string } | JsonSchema): JsonSchema {
    return {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: dataSchema,
            timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['success', 'data', 'timestamp'],
    };
}

/** Wrap an ITEM schema as a paginated list: data: item[] + meta.pagination. */
export function paginatedEnvelope(itemSchema: { $ref: string } | JsonSchema): JsonSchema {
    return {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: itemSchema },
            timestamp: { type: 'string', format: 'date-time' },
            meta: {
                type: 'object',
                properties: {
                    pagination: {
                        type: 'object',
                        properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                        },
                    },
                },
            },
        },
        required: ['success', 'data', 'timestamp'],
    };
}

class OpenApiRegistry {
    private operations: OperationDef[] = [];
    private schemas: Record<string, JsonSchema> = {};

    /** Register a named component schema; returns a `$ref` to it. */
    registerSchema(name: string, schema: JsonSchemaSource | JsonSchema): { $ref: string } {
        this.schemas[name] = asJsonSchema(schema);
        return { $ref: `#/components/schemas/${name}` };
    }

    registerPath(op: OperationDef): void {
        this.operations.push(op);
    }

    /** Assign operationIds from a `${method} ${path}` → id map (for stable codegen). */
    assignOperationIds(map: Record<string, string>): void {
        for (const op of this.operations) {
            const id = map[`${op.method} ${op.path}`];
            if (id) op.operationId = id;
        }
    }

    getSchemas(): Record<string, JsonSchema> {
        return this.schemas;
    }

    /**
     * Group registered operations by path into an OpenAPI `paths` object.
     * `unwrap: true` documents responses WITHOUT the {success,data,timestamp}
     * envelope (just the data payload) — for the FE client codegen, whose HTTP
     * interceptor strips the envelope. Default (enveloped) is the accurate wire
     * shape for external consumers.
     */
    buildPaths(opts: {unwrap?: boolean} = {}): Record<string, Record<string, unknown>> {
        const unwrap = opts.unwrap ?? false;
        const paths: Record<string, Record<string, unknown>> = {};

        for (const op of this.operations) {
            const operation: Record<string, unknown> = {
                summary: op.summary,
                tags: op.tags,
            };
            if (op.operationId) operation.operationId = op.operationId;
            if (op.security) operation.security = op.security;
            if (op.params?.length) {
                operation.parameters = op.params.map(p => ({
                    name: p.name,
                    in: p.in,
                    required: p.in === 'path' ? true : (p.required ?? false),
                    schema: p.schema,
                    ...(p.description ? { description: p.description } : {}),
                }));
            }
            if (op.request) {
                operation.requestBody = {
                    required: !op.requestOptional,
                    content: { 'application/json': { schema: op.request } },
                };
            }

            const status = String(op.status ?? 200);
            const responseContent = op.response
                ? {
                    content: {
                        'application/json': {
                            schema: this.wrapResponse(op.response, op.envelope ?? 'success', unwrap && !op.clientWrap),
                        },
                    },
                }
                : {};
            operation.responses = {
                [status]: {
                    description: op.responseDescription ?? 'Success',
                    ...responseContent,
                },
            };

            paths[op.path] = paths[op.path] ?? {};
            paths[op.path][op.method] = operation;
        }

        return paths;
    }

    private wrapResponse(
        dataSchema: { $ref: string } | JsonSchema,
        envelope: 'success' | 'paginated' | 'none',
        unwrap: boolean,
    ): { $ref: string } | JsonSchema {
        if (unwrap) {
            // No envelope (the FE interceptor strips it): list → array, else → data.
            return envelope === 'paginated' ? {type: 'array', items: dataSchema} : dataSchema;
        }
        if (envelope === 'none') return dataSchema;
        if (envelope === 'paginated') return paginatedEnvelope(dataSchema);
        return successEnvelope(dataSchema);
    }
}

export const registry = new OpenApiRegistry();
