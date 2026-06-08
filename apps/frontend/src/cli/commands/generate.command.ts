import {Command} from 'commander';
import {BaseCommand} from './base.command';
import {GenerateOptions} from '../types/config';
import {configManager} from '../config/config-manager';
import {TemplateManager} from '../templates/template-manager';
import {Validators} from '../validation/validators';
import {logger} from '../utils/logger';

/**
 * Generate command for creating DDD components
 */
export class GenerateCommand extends BaseCommand {
  constructor() {
    super('generate', 'Generate DDD components (entity, value-object, repository, etc.)');
    this.setupGenerateOptions();
  }

  static create(): Command {
    return new GenerateCommand().getCommand();
  }

  protected setupGenerateOptions(): void {
    super.setupOptions();

    this.command
      .argument('<type>', 'Type of component to generate (entity, value-object, repository, command, query, service)')
      .argument('<name>', 'Name of the component')
      .option('-d, --domain <domain>', 'Domain to generate component in', 'shared')
      .option('-p, --properties <properties>', 'Additional properties as JSON string', '{}')
      .option('--no-tests', 'Skip generating tests')
      .option('--no-docs', 'Skip generating documentation');
  }

  protected async execute(options: any): Promise<void> {
    const [type, name] = this.command.args;
    const domain = options.domain;
    const properties = this.parseProperties(options.properties);

    const generateOptions: GenerateOptions = {
      ...this.options,
      domain,
      type: type as any,
      name,
      properties
    };

    // Validate options
    const validation = Validators.validateGenerateOptions(generateOptions);
    if (!validation.valid) {
      logger.error('Validation failed:');
      validation.errors.forEach(error => logger.error(`  - ${error}`));
      process.exit(1);
    }

    // Show warnings
    if (validation.warnings.length > 0) {
      logger.warn('Warnings:');
      validation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
    }

    // Get CLI configuration
    const config = await configManager.getConfig();

    // Validate component generation
    const componentValidation = Validators.validateComponentGeneration(config, generateOptions);
    if (!componentValidation.valid) {
      logger.error('Component generation validation failed:');
      componentValidation.errors.forEach(error => logger.error(`  - ${error}`));
      process.exit(1);
    }

    // Show component warnings
    if (componentValidation.warnings.length > 0) {
      logger.warn('Component warnings:');
      componentValidation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
    }

    // Check if domain exists
    if (!config.domains.includes(domain)) {
      logger.error(`Domain '${domain}' not found. Available domains: ${config.domains.join(', ')}`);
      process.exit(1);
    }

    // Get domain configuration
    const domainConfig = configManager.getDomainConfig(domain);

    logger.info(`Generating ${type} '${name}' in domain '${domain}'`);

    // Initialize template manager
    const templateManager = new TemplateManager();

    try {
      let results: any[] = [];

      // Generate based on type
      switch (type) {
        case 'entity':
          results = await templateManager.generateEntity(
            name,
            domain,
            domainConfig,
            config,
            generateOptions,
            properties
          );
          break;

        case 'value-object':
          results = await templateManager.generateValueObject(
            name,
            domain,
            domainConfig,
            config,
            generateOptions,
            properties
          );
          break;

        case 'repository':
          results = await templateManager.generateRepository(
            name,
            domain,
            domainConfig,
            config,
            generateOptions,
            properties
          );
          break;

        case 'command':
          results = await templateManager.generateCommand(
            name,
            domain,
            domainConfig,
            config,
            generateOptions,
            properties
          );
          break;

        case 'query':
          results = await templateManager.generateQuery(
            name,
            domain,
            domainConfig,
            config,
            generateOptions,
            properties
          );
          break;

        default:
          logger.error(`Unsupported type: ${type}`);
          process.exit(1);
      }

      // Report results
      const createdCount = results.filter(r => r.created).length;
      const skippedCount = results.filter(r => !r.created).length;

      if (this.options.dryRun) {
        logger.info('DRY RUN: Would generate the following files:');
        results.forEach(result => {
          logger.info(`  - ${result.path}`);
        });
      } else {
        logger.success(`Successfully generated ${createdCount} file(s)`);
        if (skippedCount > 0) {
          logger.warn(`${skippedCount} file(s) were skipped (already exist, use --force to overwrite)`);
        }

        results.forEach(result => {
          if (result.created) {
            logger.info(`  ✅ ${result.path}`);
          } else {
            logger.info(`  ⏭️  ${result.path} (skipped)`);
          }
        });
      }

    } catch (error) {
      logger.error(`Failed to generate ${type}:`, error);
      process.exit(1);
    }
  }

  private parseProperties(propertiesStr: string): Record<string, string> {
    try {
      return JSON.parse(propertiesStr);
    } catch (error) {
      logger.error(`Invalid properties JSON: ${propertiesStr}`);
      return {};
    }
  }

}
