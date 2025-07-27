import {Command} from 'commander';
import {BaseCommand} from './base.command';
import {configManager} from '../config/config-manager';
import {logger} from '../utils/logger';

/**
 * List command for showing available domains and components
 */
export class ListCommand extends BaseCommand {
  constructor() {
    super('list', 'List available domains and components');
    this.setupListOptions();
  }

  static create(): Command {
    return new ListCommand().getCommand();
  }

  protected setupListOptions(): void {
    super.setupOptions();

    this.command
      .option('--domains', 'List available domains')
      .option('--domain <domain>', 'Show details for specific domain')
      .option('--components', 'List available component types');
  }

  protected async execute(options: any): Promise<void> {
    const config = configManager.loadConfig(options.config);

    if (options.domains) {
      this.listDomains(config);
    } else if (options.domain) {
      this.showDomainDetails(config, options.domain);
    } else if (options.components) {
      this.listComponentTypes();
    } else {
      // Show overview
      this.showOverview(config);
    }
  }

  private listDomains(config: any): void {
    logger.info('Available domains:');
    config.domains.forEach((domain: string) => {
      const domainConfig = config.domainConfigs[domain];
      console.log(`  - ${domain}: ${domainConfig.description}`);
    });
  }

  private showDomainDetails(config: any, domainName: string): void {
    try {
      const domainConfig = configManager.getDomainConfig(domainName);

      logger.info(`Domain: ${domainConfig.name}`);
      logger.info(`Description: ${domainConfig.description}`);
      logger.info(`Base Path: ${domainConfig.basePath}`);
      logger.info('');

      logger.info('Value Objects:');
      console.log(`  - Validation: ${domainConfig.valueObjects.generateValidation ? '✅' : '❌'}`);
      console.log(`  - Factories: ${domainConfig.valueObjects.generateFactories ? '✅' : '❌'}`);

      logger.info('Entities:');
      console.log(`  - Events: ${domainConfig.entities.generateEvents ? '✅' : '❌'}`);
      console.log(`  - Repositories: ${domainConfig.entities.generateRepositories ? '✅' : '❌'}`);

      logger.info('Application:');
      console.log(`  - Handlers: ${domainConfig.application.generateHandlers ? '✅' : '❌'}`);
      console.log(`  - Queries: ${domainConfig.application.generateQueries ? '✅' : '❌'}`);

      logger.info('Infrastructure:');
      console.log(`  - Prisma Repos: ${domainConfig.infrastructure.generatePrismaRepos ? '✅' : '❌'}`);
      console.log(`  - Mappers: ${domainConfig.infrastructure.generateMappers ? '✅' : '❌'}`);

    } catch (error) {
      logger.error(`Domain '${domainName}' not found`);
    }
  }

  private listComponentTypes(): void {
    logger.info('Available component types:');
    const types = [
      { name: 'entity', description: 'Domain entities with behavior' },
      { name: 'value-object', description: 'Immutable value objects' },
      { name: 'repository', description: 'Data access interfaces and implementations' },
      { name: 'command', description: 'Write operations (CQRS)' },
      { name: 'query', description: 'Read operations (CQRS)' },
      { name: 'service', description: 'Domain services and application services' }
    ];

    types.forEach(type => {
      console.log(`  - ${type.name}: ${type.description}`);
    });
  }

  private showOverview(config: any): void {
    logger.info('IoT Pilot DDD Generator Overview');
    logger.info('================================');
    logger.info('');
    logger.info(`Base Directory: ${config.baseDir}`);
    logger.info(`Domains: ${config.domains.length}`);
    logger.info(`Author: ${config.author}`);
    logger.info(`License: ${config.license}`);
    logger.info('');

    logger.info('Use the following commands:');
    logger.info('  --domains          List all domains');
    logger.info('  --domain <name>    Show domain details');
    logger.info('  --components       List component types');
  }
}
