import * as path from 'path';
import {TemplateEngine} from './template-engine';
import {CLIOptions, DDDConfig, TemplateContext, TemplateResult} from '../types/config';

/**
 * Template manager for generating DDD components
 */
export class TemplateManager {
  private engine: TemplateEngine;

  constructor(templatesDir?: string) {
    this.engine = new TemplateEngine(templatesDir);
  }

  /**
   * Generate entity component
   */
  async generateEntity(
    name: string,
    domain: string,
    domainConfig: any,
    config: DDDConfig,
    options: CLIOptions,
    properties: Record<string, string> = {}
  ): Promise<TemplateResult[]> {
    const context: TemplateContext = {
      name,
      pascalName: this.toPascalCase(name),
      camelName: this.toCamelCase(name),
      kebabName: this.toKebabCase(name),
      domain,
      domainConfig,
      config,
      options,
      data: {
        properties,
        generateEvents: domainConfig.entities.generateEvents,
        author: config.author,
        license: config.license
      }
    };

    const results: TemplateResult[] = [];

    // Generate entity file
    const entityPath = path.join(
      config.baseDir,
      domainConfig.basePath,
      'domain/entities',
      `${context.kebabName}.entity.ts`
    );

    const entityResult = await this.engine.generateFile(
      'entity',
      context,
      entityPath,
      { force: options.force, dryRun: options.dryRun }
    );
    results.push(entityResult);

    // Generate test file if enabled
    if (config.generation.generateTests) {
      const testPath = path.join(
        'src/__tests__/unit/lib',
        domainConfig.basePath,
        'domain/entities',
        `${context.kebabName}.entity.test.ts`
      );

      const testResult = await this.engine.generateFile(
        'entity-test',
        context,
        testPath,
        { force: options.force, dryRun: options.dryRun }
      );
      results.push(testResult);
    }

    return results;
  }

  /**
   * Generate value object component
   */
  async generateValueObject(
    name: string,
    domain: string,
    domainConfig: any,
    config: DDDConfig,
    options: CLIOptions,
    properties: Record<string, string> = {}
  ): Promise<TemplateResult[]> {
    const context: TemplateContext = {
      name,
      pascalName: this.toPascalCase(name),
      camelName: this.toCamelCase(name),
      kebabName: this.toKebabCase(name),
      domain,
      domainConfig,
      config,
      options,
      data: {
        properties,
        generateValidation: domainConfig.valueObjects.generateValidation,
        generateFactories: domainConfig.valueObjects.generateFactories,
        author: config.author,
        license: config.license
      }
    };

    const results: TemplateResult[] = [];

    // Generate value object file
    const voPath = path.join(
      config.baseDir,
      domainConfig.basePath,
      'domain/value-objects',
      `${context.kebabName}.vo.ts`
    );

    const voResult = await this.engine.generateFile(
      'value-object',
      context,
      voPath,
      { force: options.force, dryRun: options.dryRun }
    );
    results.push(voResult);

    // Generate test file if enabled
    if (config.generation.generateTests) {
      const testPath = path.join(
        'src/__tests__/unit/lib',
        domainConfig.basePath,
        'domain/value-objects',
        `${context.kebabName}.vo.test.ts`
      );

      const testResult = await this.engine.generateFile(
        'value-object-test',
        context,
        testPath,
        { force: options.force, dryRun: options.dryRun }
      );
      results.push(testResult);
    }

    return results;
  }

  /**
   * Generate repository component
   */
  async generateRepository(
    name: string,
    domain: string,
    domainConfig: any,
    config: DDDConfig,
    options: CLIOptions,
    properties: Record<string, string> = {}
  ): Promise<TemplateResult[]> {
    const context: TemplateContext = {
      name,
      pascalName: this.toPascalCase(name),
      camelName: this.toCamelCase(name),
      kebabName: this.toKebabCase(name),
      domain,
      domainConfig,
      config,
      options,
      data: {
        properties,
        generatePrisma: domainConfig.infrastructure.generatePrismaRepos,
        author: config.author,
        license: config.license
      }
    };

    const results: TemplateResult[] = [];

    // Generate repository interface
    const interfacePath = path.join(
      config.baseDir,
      domainConfig.basePath,
      'domain/interfaces',
      `${context.kebabName}.repository.ts`
    );

    const interfaceResult = await this.engine.generateFile(
      'repository-interface',
      context,
      interfacePath,
      { force: options.force, dryRun: options.dryRun }
    );
    results.push(interfaceResult);

    // Generate Prisma repository implementation if enabled
    if (domainConfig.infrastructure.generatePrismaRepos) {
      const prismaPath = path.join(
        config.baseDir,
        domainConfig.basePath,
        'infrastructure/repositories',
        `prisma-${context.kebabName}.repository.ts`
      );

      const prismaResult = await this.engine.generateFile(
        'repository-prisma',
        context,
        prismaPath,
        { force: options.force, dryRun: options.dryRun }
      );
      results.push(prismaResult);
    }

    // Generate mapper if enabled
    if (domainConfig.infrastructure.generateMappers) {
      const mapperPath = path.join(
        config.baseDir,
        domainConfig.basePath,
        'infrastructure/mappers',
        `${context.kebabName}.mapper.ts`
      );

      const mapperResult = await this.engine.generateFile(
        'mapper',
        context,
        mapperPath,
        { force: options.force, dryRun: options.dryRun }
      );
      results.push(mapperResult);
    }

    return results;
  }

  /**
   * Generate command component
   */
  async generateCommand(
    name: string,
    domain: string,
    domainConfig: any,
    config: DDDConfig,
    options: CLIOptions,
    properties: Record<string, string> = {}
  ): Promise<TemplateResult[]> {
    const context: TemplateContext = {
      name,
      pascalName: this.toPascalCase(name),
      camelName: this.toCamelCase(name),
      kebabName: this.toKebabCase(name),
      domain,
      domainConfig,
      config,
      options,
      data: {
        properties,
        generateHandler: domainConfig.application.generateHandlers,
        author: config.author,
        license: config.license
      }
    };

    const results: TemplateResult[] = [];

    // Generate command DTO
    const commandPath = path.join(
      config.baseDir,
      domainConfig.basePath,
      'application/commands',
      `${context.kebabName}.command.ts`
    );

    const commandResult = await this.engine.generateFile(
      'command',
      context,
      commandPath,
      { force: options.force, dryRun: options.dryRun }
    );
    results.push(commandResult);

    // Generate command handler if enabled
    if (domainConfig.application.generateHandlers) {
      const handlerPath = path.join(
        config.baseDir,
        domainConfig.basePath,
        'application/commands',
        `${context.kebabName}.handler.ts`
      );

      const handlerResult = await this.engine.generateFile(
        'command-handler',
        context,
        handlerPath,
        { force: options.force, dryRun: options.dryRun }
      );
      results.push(handlerResult);
    }

    return results;
  }

  /**
   * Generate query component
   */
  async generateQuery(
    name: string,
    domain: string,
    domainConfig: any,
    config: DDDConfig,
    options: CLIOptions,
    properties: Record<string, string> = {}
  ): Promise<TemplateResult[]> {
    const context: TemplateContext = {
      name,
      pascalName: this.toPascalCase(name),
      camelName: this.toCamelCase(name),
      kebabName: this.toKebabCase(name),
      domain,
      domainConfig,
      config,
      options,
      data: {
        properties,
        generateHandler: domainConfig.application.generateQueries,
        author: config.author,
        license: config.license
      }
    };

    const results: TemplateResult[] = [];

    // Generate query DTO
    const queryPath = path.join(
      config.baseDir,
      domainConfig.basePath,
      'application/queries',
      `${context.kebabName}.query.ts`
    );

    const queryResult = await this.engine.generateFile(
      'query',
      context,
      queryPath,
      { force: options.force, dryRun: options.dryRun }
    );
    results.push(queryResult);

    // Generate query handler if enabled
    if (domainConfig.application.generateQueries) {
      const handlerPath = path.join(
        config.baseDir,
        domainConfig.basePath,
        'application/queries',
        `${context.kebabName}.handler.ts`
      );

      const handlerResult = await this.engine.generateFile(
        'query-handler',
        context,
        handlerPath,
        { force: options.force, dryRun: options.dryRun }
      );
      results.push(handlerResult);
    }

    return results;
  }

  /**
   * Utility methods for string conversion
   */
  private toCamelCase(str: string): string {
    return str.replace(/[-_](.)/g, (_, letter) => letter.toUpperCase());
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, letter) => letter.toUpperCase())
      .replace(/^./, str => str.toUpperCase());
  }

  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
