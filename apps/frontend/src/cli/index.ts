#!/usr/bin/env node

import {Command} from 'commander';
import {GenerateCommand} from './commands/generate.command';
import {ListCommand} from './commands/list.command';
import {ValidateCommand} from './commands/validate.command';
import {InitCommand} from './commands/init.command';
import {logger} from './utils/logger';

const program = new Command();

// CLI Configuration
program
  .name('iotpilot-ddd')
  .description('IoT Pilot DDD Code Generator')
  .version('1.0.0');

// Register commands
program.addCommand(GenerateCommand.create());
program.addCommand(ListCommand.create());
program.addCommand(ValidateCommand.create());
program.addCommand(InitCommand.create());

// Global options
program
  .option('-v, --verbose', 'enable verbose logging')
  .option('--dry-run', 'show what would be generated without creating files')
  .option('--config <path>', 'path to config file', './ddd.config.json');

// Error handling
program.exitOverride();

try {
  program.parse(process.argv);
} catch (error) {
  if (error instanceof Error) {
    logger.error(error.message);
    process.exit(1);
  }
  logger.error('An unexpected error occurred');
  console.error(error);
  process.exit(1);
}
