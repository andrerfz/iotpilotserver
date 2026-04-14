import {Command} from 'commander';
import {BaseCommand} from './base.command';
import {configManager} from '../config/config-manager';
import {logger} from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Init command for initializing DDD project structure
 */
export class InitCommand extends BaseCommand {
  constructor() {
    super('init', 'Initialize DDD project structure and configuration');
    this.setupInitOptions();
  }

  static create(): Command {
    return new InitCommand().getCommand();
  }

  protected setupInitOptions(): void {
    super.setupOptions();

    this.command
      .option('--yes', 'Skip confirmation prompts')
      .option('--template <template>', 'Project template to use', 'default')
      .option('--domains <domains>', 'Comma-separated list of domains to create');
  }

  protected async execute(options: any): Promise<void> {
    logger.info('Initializing DDD project structure...');

    // Check if already initialized
    const existingConfig = this.findExistingConfig();
    if (existingConfig && !options.force) {
      logger.warn(`DDD project already initialized at: ${existingConfig}`);
      logger.warn('Use --force to reinitialize');
      return;
    }

    // Confirm action
    if (!options.yes && !this.options.dryRun) {
      const confirmed = await this.confirmAction('This will create DDD directory structure. Continue?');
      if (!confirmed) {
        logger.info('Initialization cancelled');
        return;
      }
    }

    // Create default configuration
    const config = configManager.loadConfig(options.config);

    if (this.options.dryRun) {
      logger.info('DRY RUN: Would create the following structure:');
      this.showStructurePreview(config);
      return;
    }

    // Create directory structure
    await this.createDirectoryStructure(config);

    // Create index files
    await this.createIndexFiles(config);

    // Save configuration
    configManager.saveConfig();

    logger.success('✅ DDD project initialized successfully!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('  1. Review the generated ddd.config.json');
    logger.info('  2. Use "iotpilot-ddd generate <type> <name>" to create components');
    logger.info('  3. Use "iotpilot-ddd validate" to check your structure');
  }

  private findExistingConfig(): string | null {
    const configPaths = [
      'ddd.config.json',
      'src/lib/ddd.config.json',
      '.ddd/config.json'
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    return null;
  }

  private showStructurePreview(config: any): void {
    console.log('');
    console.log('Configuration: ddd.config.json');
    console.log('Base Directory:', config.baseDir);
    console.log('');

    config.domains.forEach((domain: string) => {
      const domainConfig = config.domainConfigs[domain];
      console.log(`Domain: ${domain}/`);
      console.log(`  ├── domain/`);
      console.log(`  │   ├── entities/`);
      console.log(`  │   ├── value-objects/`);
      console.log(`  │   ├── services/`);
      console.log(`  │   └── interfaces/`);
      console.log(`  ├── application/`);
      console.log(`  │   ├── commands/`);
      console.log(`  │   └── queries/`);
      console.log(`  └── infrastructure/`);
      console.log(`      ├── repositories/`);
      console.log(`      └── mappers/`);
      console.log('');
    });
  }

  private async createDirectoryStructure(config: any): Promise<void> {
    const dirsToCreate: string[] = [];

    for (const domain of config.domains) {
      const domainConfig = config.domainConfigs[domain];
      const domainPath = path.join(config.baseDir, domainConfig.basePath);

      const domainDirs = [
        '',
        'domain',
        'domain/entities',
        'domain/value-objects',
        'domain/services',
        'domain/interfaces',
        'domain/events',
        'domain/policies',
        'domain/exceptions',
        'application',
        'application/commands',
        'application/queries',
        'application/services',
        'infrastructure',
        'infrastructure/repositories',
        'infrastructure/mappers',
        'infrastructure/services',
        'infrastructure/dto'
      ];

      domainDirs.forEach(dir => {
        dirsToCreate.push(path.join(domainPath, dir));
      });
    }

    // Create test directories
    for (const domain of config.domains) {
      const domainConfig = config.domainConfigs[domain];
      const testPath = path.join('src/__tests__', domainConfig.basePath);

      const testDirs = [
        '',
        'unit',
        'integration'
      ];

      testDirs.forEach(dir => {
        dirsToCreate.push(path.join(testPath, dir));
      });
    }

    // Create directories
    for (const dir of dirsToCreate) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      }
    }
  }

  private async createIndexFiles(config: any): Promise<void> {
    const indexContent = `// ${config.author}
// Generated by IoT Pilot DDD CLI
// ${new Date().toISOString()}

export {};
`;

    for (const domain of config.domains) {
      const domainConfig = config.domainConfigs[domain];
      const domainPath = path.join(config.baseDir, domainConfig.basePath);

      const indexFiles = [
        'domain/entities/index.ts',
        'domain/value-objects/index.ts',
        'domain/services/index.ts',
        'domain/interfaces/index.ts',
        'application/commands/index.ts',
        'application/queries/index.ts',
        'application/services/index.ts',
        'infrastructure/repositories/index.ts',
        'infrastructure/mappers/index.ts'
      ];

      for (const indexFile of indexFiles) {
        const filePath = path.join(domainPath, indexFile);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, indexContent);
          logger.debug(`Created index file: ${filePath}`);
        }
      }
    }
  }
}
