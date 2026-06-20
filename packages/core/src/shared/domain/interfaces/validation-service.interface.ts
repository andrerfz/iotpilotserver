/**
 * Validation Service Interface
 * 
 * Abstraction for schema validation to support:
 * - Better testability (mockable)
 * - DDD alignment (domain doesn't depend on Zod directly)
 * - Flexibility (can swap implementations if needed)
 */

export interface ValidationError {
  path: (string | number)[];
  message: string;
  code: string;
  received?: unknown;
}

export type ValidationResult<T> =
  | { success: true; data: T; errors?: undefined }
  | { success: false; data?: undefined; errors: ValidationError[] };

export interface Schema<T = any> {
  parse(data: unknown): T;
  safeParse(data: unknown): ValidationResult<T>;
}

/**
 * Validation Service Interface
 * Provides schema validation capabilities
 */
export interface ValidationService {
  /**
   * Creates a string schema
   */
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
  }): Schema<string>;

  /**
   * Creates a number schema
   */
  number(options?: {
    min?: number;
    max?: number;
    int?: boolean;
    positive?: boolean;
    message?: string;
  }): Schema<number>;

  /**
   * Creates a boolean schema
   */
  boolean(): Schema<boolean>;

  /**
   * Creates an object schema
   */
  object<T extends Record<string, Schema>>(shape: T): Schema<{
    [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
  }>;

  /**
   * Creates an array schema
   */
  array<T>(itemSchema: Schema<T>): Schema<T[]>;

  /**
   * Creates an enum schema
   */
  enum<T extends readonly [string, ...string[]]>(values: T): Schema<T[number]>;

  /**
   * Creates an optional schema
   */
  optional<T>(schema: Schema<T>): Schema<T | undefined>;

  /**
   * Creates a nullable schema
   */
  nullable<T>(schema: Schema<T>): Schema<T | null>;

  /**
   * Creates a default value schema
   */
  default<T>(schema: Schema<T>, defaultValue: T): Schema<T>;

  /**
   * Creates a union schema
   */
  union<T extends readonly [Schema<any>, Schema<any>, ...Schema<any>[]]>(
    schemas: T
  ): Schema<T[number] extends Schema<infer U> ? U : never>;

  /**
   * Creates a literal schema
   */
  literal<T extends string | number | boolean>(value: T): Schema<T>;

  /**
   * Creates a custom schema with transform
   */
  transform<I, O>(
    inputSchema: Schema<I>,
    transformFn: (input: I) => O
  ): Schema<O>;

  /**
   * Creates a schema that pipes through multiple transformations
   */
  pipe<I, O>(
    inputSchema: Schema<I>,
    ...transforms: Array<(input: any) => any>
  ): Schema<O>;

  /**
   * Creates a schema that accepts any value
   */
  any(): Schema<any>;

  /**
   * Creates a schema that accepts unknown value
   */
  unknown(): Schema<unknown>;

  /**
   * Creates a schema that accepts void/null
   */
  void(): Schema<void>;

  /**
   * Creates a schema that accepts null
   */
  null(): Schema<null>;

  /**
   * Creates a schema that accepts undefined
   */
  undefined(): Schema<undefined>;

  /**
   * Creates a date schema
   */
  date(options?: {
    min?: Date;
    max?: Date;
    message?: string;
  }): Schema<Date>;

  /**
   * Creates a record schema
   */
  record<K extends string | number, V>(
    keySchema: Schema<K>,
    valueSchema: Schema<V>
  ): Schema<Record<K, V>>;
}

