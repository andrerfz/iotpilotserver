/**
 * CLI Configuration Types
 */

export interface DDDConfig {
  /** Base directory for the DDD structure */
  baseDir: string;

  /** Domain namespaces */
  domains: string[];

  /** Default author for generated files */
  author: string;

  /** License for generated files */
  license: string;

  /** Template engine to use */
  templateEngine: 'handlebars' | 'ejs';

  /** Code generation options */
  generation: {
    /** Whether to generate tests automatically */
    generateTests: boolean;

    /** Whether to generate documentation */
    generateDocs: boolean;

    /** Whether to use TypeScript strict mode */
    strictTypes: boolean;

    /** Import style preference */
    importStyle: 'named' | 'default';
  };

  /** Domain-specific configurations */
  domainConfigs: Record<string, DomainConfig>;
}

export interface DomainConfig {
  /** Domain name */
  name: string;

  /** Domain description */
  description: string;

  /** Base path for domain files */
  basePath: string;

  /** Value object settings */
  valueObjects: {
    /** Whether to generate validation */
    generateValidation: boolean;

    /** Whether to generate factory methods */
    generateFactories: boolean;
  };

  /** Entity settings */
  entities: {
    /** Whether to generate domain events */
    generateEvents: boolean;

    /** Whether to generate repository interfaces */
    generateRepositories: boolean;
  };

  /** Application layer settings */
  application: {
    /** Whether to generate command handlers */
    generateHandlers: boolean;

    /** Whether to generate queries */
    generateQueries: boolean;
  };

  /** Infrastructure settings */
  infrastructure: {
    /** Whether to generate Prisma repositories */
    generatePrismaRepos: boolean;

    /** Whether to generate mappers */
    generateMappers: boolean;
  };
}

export interface CLIOptions {
  /** Verbose logging */
  verbose: boolean;

  /** Dry run mode */
  dryRun: boolean;

  /** Force overwrite existing files */
  force: boolean;

  /** Interactive mode */
  interactive: boolean;
}

export interface GenerateOptions extends CLIOptions {
  /** Domain to generate for */
  domain: string;

  /** Type of component to generate */
  type: 'entity' | 'value-object' | 'repository' | 'command' | 'query' | 'service';

  /** Name of the component */
  name: string;

  /** Additional properties/fields */
  properties?: Record<string, string>;
}

export interface TemplateContext {
  /** Component name */
  name: string;

  /** Component name in PascalCase */
  pascalName: string;

  /** Component name in camelCase */
  camelName: string;

  /** Component name in kebab-case */
  kebabName: string;

  /** Domain name */
  domain: string;

  /** Domain config */
  domainConfig: DomainConfig;

  /** Global config */
  config: DDDConfig;

  /** CLI options */
  options: CLIOptions;

  /** Additional context data */
  data: Record<string, any>;
}

export interface TemplateResult {
  /** Generated file path */
  path: string;

  /** Generated content */
  content: string;

  /** Whether file was created/overwritten */
  created: boolean;
}
