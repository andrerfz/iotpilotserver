import {Command} from 'commander';
import {CLIOptions} from '../types/config';
import {logger} from '../utils/logger';

/**
 * Base command class for CLI commands
 */
export abstract class BaseCommand {
  protected command: Command;
  protected options: CLIOptions = {
    verbose: false,
    dryRun: false,
    force: false,
    interactive: false
  };

  constructor(name: string, description: string) {
    this.command = new Command(name).description(description);
    this.setupOptions();
    this.setupAction();
  }

  /**
   * Get the commander command instance
   */
  getCommand(): Command {
    return this.command;
  }

  /**
   * Setup command options
   */
  protected setupOptions(): void {
    this.command
      .option('-v, --verbose', 'enable verbose logging')
      .option('--dry-run', 'show what would be generated without creating files')
      .option('-f, --force', 'force overwrite existing files')
      .option('-i, --interactive', 'interactive mode for user input');
  }

  /**
   * Setup command action
   */
  protected setupAction(): void {
    this.command.action(async (options: any) => {
      try {
        // Update logger level based on verbose option
        if (options.verbose) {
          logger.setLevel(3); // DEBUG level
        }

        // Set CLI options
        this.options = {
          verbose: options.verbose || false,
          dryRun: options.dryRun || false,
          force: options.force || false,
          interactive: options.interactive || false
        };

        // Execute the command
        await this.execute(options);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        } else {
          logger.error('An unexpected error occurred:', error);
        }
        process.exit(1);
      }
    });
  }

  /**
   * Execute the command logic
   */
  protected abstract execute(options: any): Promise<void>;

  /**
   * Validate command options
   */
  protected validateOptions(options: any): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  /**
   * Confirm action in interactive mode
   */
  protected async confirmAction(message: string): Promise<boolean> {
    if (!this.options.interactive) {
      return true;
    }

    return new Promise((resolve) => {
      process.stdout.write(`${message} (y/N): `);
      process.stdin.once('data', (data) => {
        const answer = data.toString().trim().toLowerCase();
        resolve(answer === 'y' || answer === 'yes');
      });
    });
  }
}
