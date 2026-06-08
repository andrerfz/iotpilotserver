import {Command} from 'commander';
import {BaseCommand} from './base.command';
import {configManager} from '../config/config-manager';
import {ValidationResult, Validators} from '../validation/validators';
import {logger} from '../utils/logger';

/**
 * Validate command for checking DDD structure and configuration
 */
export class ValidateCommand extends BaseCommand {
  constructor() {
    super('validate', 'Validate DDD structure and configuration');
    this.setupValidateOptions();
  }

  static create(): Command {
    return new ValidateCommand().getCommand();
  }

  protected setupValidateOptions(): void {
    super.setupOptions();

    this.command
      .option('--config-only', 'Validate configuration only')
      .option('--structure-only', 'Validate directory structure only')
      .option('--domain <domain>', 'Validate specific domain only');
  }

  protected async execute(options: any): Promise<void> {
    logger.info('Validating DDD structure and configuration...');

    const results: ValidationResult[] = [];
    let allValid = true;

    // Validate configuration
    if (!options.structureOnly) {
      logger.debug('Validating configuration...');
      const configResult = Validators.validateConfiguration(options.config);
      results.push(configResult);
      allValid = allValid && configResult.valid;

      if (configResult.valid) {
        logger.success('✅ Configuration validation passed');
      } else {
        logger.error('❌ Configuration validation failed');
        console.log(Validators.formatResult(configResult));
      }
    }

    // Validate directory structure
    if (!options.configOnly) {
      logger.debug('Validating directory structure...');
      const config = configManager.loadConfig(options.config);
      const structureResult = Validators.validateProjectStructure(config, options.domain);
      results.push(structureResult);
      allValid = allValid && structureResult.valid;

      if (structureResult.valid && structureResult.errors.length === 0) {
        logger.success('✅ Directory structure validation passed');
      } else {
        logger.error('❌ Directory structure validation failed');
        console.log(Validators.formatResult(structureResult));
      }
    }

    // Show summary
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    logger.info('');
    logger.info('Validation Summary:');
    logger.info(`  Errors: ${totalErrors}`);
    logger.info(`  Warnings: ${totalWarnings}`);

    if (allValid && totalErrors === 0) {
      logger.success('✅ All validations passed!');
    } else {
      if (totalErrors > 0) {
        logger.error('❌ Validation failed due to errors');
        process.exit(1);
      } else if (totalWarnings > 0) {
        logger.warn('⚠️  Validation passed with warnings');
      }
    }
  }

}
