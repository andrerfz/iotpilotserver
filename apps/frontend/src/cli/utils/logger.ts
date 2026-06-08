/**
 * CLI Logger utility
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private level: LogLevel = LogLevel.INFO;
  private useColors: boolean = true;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setColors(useColors: boolean): void {
    this.useColors = useColors;
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, 'red', 'ERROR', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, 'yellow', 'WARN', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, 'blue', 'INFO', message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, 'gray', 'DEBUG', message, ...args);
  }

  success(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, 'green', 'SUCCESS', message, ...args);
  }

  private log(level: LogLevel, color: string, prefix: string, message: string, ...args: any[]): void {
    if (level > this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const coloredPrefix = this.useColors ? this.colorize(color, prefix) : prefix;
    const formattedMessage = `[${timestamp}] ${coloredPrefix}: ${message}`;

    if (args.length > 0) {
      console.log(formattedMessage, ...args);
    } else {
      console.log(formattedMessage);
    }
  }

  private colorize(color: string, text: string): string {
    if (!this.useColors) {
      return text;
    }

    const colors: Record<string, string> = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
      reset: '\x1b[0m'
    };

    return `${colors[color]}${text}${colors.reset}`;
  }
}

// Export singleton instance
export const logger = new Logger();

// Configure logger based on environment
if (process.env.NODE_ENV === 'test') {
  logger.setColors(false);
}

if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
  logger.setLevel(LogLevel.DEBUG);
}
