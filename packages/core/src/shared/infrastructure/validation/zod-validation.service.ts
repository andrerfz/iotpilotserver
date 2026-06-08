import {
    Schema,
    ValidationError,
    ValidationResult,
    ValidationService
} from '../../domain/interfaces/validation-service.interface';
import {z, ZodError, ZodSchema} from 'zod';

/**
 * Zod-based implementation of ValidationService
 * Infrastructure layer implementation using Zod library
 */
export class ZodValidationService implements ValidationService {
  string(options?: {
    min?: number;
    max?: number;
    email?: boolean;
    url?: boolean;
    uuid?: boolean;
    ip?: boolean | string;
    datetime?: boolean;
    regex?: RegExp;
    message?: string;
  }): Schema<string> {
    let schema: z.ZodString = z.string();

    if (options?.min !== undefined) {
      schema = schema.min(options.min, options?.message);
    }
    if (options?.max !== undefined) {
      schema = schema.max(options.max, options?.message);
    }
    if (options?.email) {
      schema = schema.email(options?.message);
    }
    if (options?.url) {
      schema = schema.url(options?.message);
    }
    if (options?.uuid) {
      schema = schema.uuid(options?.message);
    }
    if (options?.ip) {
      const ipVersion = typeof options.ip === 'string' ? (options.ip as 'v4' | 'v6') : undefined;
      if (ipVersion) {
        schema = schema.ip({ version: ipVersion, message: options?.message });
      } else {
        schema = schema.ip({ message: options?.message });
      }
    }
    if (options?.datetime) {
      schema = schema.datetime(options?.message);
    }
    if (options?.regex) {
      schema = schema.regex(options.regex, options?.message);
    }

    return this.wrapSchema(schema);
  }

  number(options?: {
    min?: number;
    max?: number;
    int?: boolean;
    positive?: boolean;
    message?: string;
  }): Schema<number> {
    let schema: z.ZodNumber = z.number();

    if (options?.min !== undefined) {
      schema = schema.min(options.min, options?.message);
    }
    if (options?.max !== undefined) {
      schema = schema.max(options.max, options?.message);
    }
    if (options?.int) {
      schema = schema.int(options?.message);
    }
    if (options?.positive) {
      schema = schema.positive(options?.message);
    }

    return this.wrapSchema(schema);
  }

  boolean(): Schema<boolean> {
    return this.wrapSchema(z.boolean());
  }

  object<T extends Record<string, Schema>>(shape: T): Schema<{
    [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
  }> {
    const zodShape: Record<string, ZodSchema> = {};
    for (const [key, schema] of Object.entries(shape)) {
      zodShape[key] = (schema as any).__zodSchema;
    }
    return this.wrapSchema(z.object(zodShape)) as Schema<{
      [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
    }>;
  }

  array<T>(itemSchema: Schema<T>): Schema<T[]> {
    return this.wrapSchema(z.array((itemSchema as any).__zodSchema));
  }

  enum<T extends readonly [string, ...string[]]>(values: T): Schema<T[number]> {
    return this.wrapSchema(z.enum(values));
  }

  optional<T>(schema: Schema<T>): Schema<T | undefined> {
    return this.wrapSchema((schema as any).__zodSchema.optional());
  }

  nullable<T>(schema: Schema<T>): Schema<T | null> {
    return this.wrapSchema((schema as any).__zodSchema.nullable());
  }

  default<T>(schema: Schema<T>, defaultValue: T): Schema<T> {
    return this.wrapSchema((schema as any).__zodSchema.default(defaultValue));
  }

  union<T extends readonly [Schema<any>, Schema<any>, ...Schema<any>[]]>(
    schemas: T
  ): Schema<T[number] extends Schema<infer U> ? U : never> {
    const zodSchemas = schemas.map(s => (s as any).__zodSchema) as [ZodSchema, ZodSchema, ...ZodSchema[]];
    return this.wrapSchema(z.union(zodSchemas));
  }

  literal<T extends string | number | boolean>(value: T): Schema<T> {
    return this.wrapSchema(z.literal(value));
  }

  transform<I, O>(
    inputSchema: Schema<I>,
    transformFn: (input: I) => O
  ): Schema<O> {
    return this.wrapSchema((inputSchema as any).__zodSchema.transform(transformFn));
  }

  pipe<I, O>(
    inputSchema: Schema<I>,
    ...transforms: Array<(input: any) => any>
  ): Schema<O> {
    let schema: any = (inputSchema as any).__zodSchema;
    for (const transform of transforms) {
      schema = schema.pipe(z.any().transform(transform));
    }
    return this.wrapSchema(schema);
  }

  any(): Schema<any> {
    return this.wrapSchema(z.any());
  }

  unknown(): Schema<unknown> {
    return this.wrapSchema(z.unknown());
  }

  void(): Schema<void> {
    return this.wrapSchema(z.void());
  }

  null(): Schema<null> {
    return this.wrapSchema(z.null());
  }

  undefined(): Schema<undefined> {
    return this.wrapSchema(z.undefined());
  }

  date(options?: {
    min?: Date;
    max?: Date;
    message?: string;
  }): Schema<Date> {
    let schema: z.ZodDate = z.date();
    if (options?.min) {
      schema = schema.min(options.min, options?.message);
    }
    if (options?.max) {
      schema = schema.max(options.max, options?.message);
    }
    return this.wrapSchema(schema);
  }

  record<K extends string | number, V>(
    keySchema: Schema<K>,
    valueSchema: Schema<V>
  ): Schema<Record<K, V>> {
    return this.wrapSchema(
      z.record(
        (keySchema as any).__zodSchema,
        (valueSchema as any).__zodSchema
      )
    );
  }

  /**
   * Wraps a Zod schema to implement our Schema interface
   */
  private wrapSchema<T>(zodSchema: ZodSchema<T>): Schema<T> {
    const schema: Schema<T> = {
      parse: (data: unknown) => {
        return zodSchema.parse(data);
      },
      safeParse: (data: unknown): ValidationResult<T> => {
        const result = zodSchema.safeParse(data);
        if (result.success) {
          return {
            success: true,
            data: result.data
          };
        } else {
          return {
            success: false,
            errors: this.mapZodErrors(result.error)
          };
        }
      }
    };

    // Store the underlying Zod schema for internal use
    (schema as any).__zodSchema = zodSchema;

    return schema;
  }

  /**
   * Maps Zod errors to our ValidationError format
   */
  private mapZodErrors(zodError: ZodError): ValidationError[] {
    return zodError.errors.map(err => ({
      path: err.path,
      message: err.message,
      code: err.code,
      received: (err as any).received
    }));
  }

  /**
   * Helper to create a schema from a Zod schema directly
   * Useful for migration or complex schemas
   */
  fromZodSchema<T>(zodSchema: ZodSchema<T>): Schema<T> {
    return this.wrapSchema(zodSchema);
  }
}

