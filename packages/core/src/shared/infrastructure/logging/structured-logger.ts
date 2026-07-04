import {TenantContext} from '../../domain/tenant-context';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  customerId?: string;
  userId?: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: string;
  service: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export class StructuredLogger {
  // Shared across every instance — set once from env at boot, mutable at runtime
  // so the admin "Log Level" setting (Settings → App Config) can take effect
  // without a restart.
  private static currentLevel: LogLevel =
    (process.env.LOG_LEVEL as LogLevel) in LEVEL_RANK ? (process.env.LOG_LEVEL as LogLevel) : 'info';

  static setLevel(level: string): void {
    if (level in LEVEL_RANK) {
      StructuredLogger.currentLevel = level as LogLevel;
    }
  }

  static getLevel(): LogLevel {
    return StructuredLogger.currentLevel;
  }

  private static shouldLog(level: LogLevel): boolean {
    return LEVEL_RANK[level] >= LEVEL_RANK[StructuredLogger.currentLevel];
  }

  constructor(
    private readonly serviceName: string = 'iotpilot',
    private readonly context?: TenantContext
  ) {}

  private getLogContext(message: string, additionalContext?: any): LogContext {
    const baseContext: LogContext = {
      level: 'info',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      correlationId: this.context?.getCorrelationId() || 'unknown',
      requestId: this.context?.getRequestId() || 'unknown'
    };

    if (this.context?.getCustomerId()) {
      baseContext.customerId = this.context.getCustomerId()!.value;
    }

    if (this.context?.getUserId()) {
      baseContext.userId = this.context.getUserId().getValue();
    }

    return {
      ...baseContext,
      message,
      ...(additionalContext || {})
    };
  }

  debug(message: string, context?: any): void {
    if (!StructuredLogger.shouldLog('debug')) return;
    const logEntry = this.getLogContext(message, { ...context, level: 'debug' });
    console.debug(JSON.stringify(logEntry));
  }

  info(message: string, context?: any): void {
    if (!StructuredLogger.shouldLog('info')) return;
    const logEntry = this.getLogContext(message, { ...context, level: 'info' });
    console.info(JSON.stringify(logEntry));
  }

  warn(message: string, context?: any): void {
    if (!StructuredLogger.shouldLog('warn')) return;
    const logEntry = this.getLogContext(message, { ...context, level: 'warn' });
    console.warn(JSON.stringify(logEntry));
  }

  error(message: string, context?: any, error?: Error): void {
    if (!StructuredLogger.shouldLog('error')) return;
    const logEntry = this.getLogContext(message, {
      ...context,
      level: 'error',
      ...(error && { error: error.message, stack: error.stack })
    });
    console.error(JSON.stringify(logEntry));
  }

  // Factory methods
  static forService(serviceName: string): StructuredLogger {
    return new StructuredLogger(serviceName);
  }

  static forContext(context: TenantContext): StructuredLogger {
    return new StructuredLogger('application', context);
  }

  static forCommand(commandName: string, context: TenantContext): StructuredLogger {
    return new StructuredLogger(`command-${commandName}`, context);
  }

  static forQuery(queryName: string, context: TenantContext): StructuredLogger {
    return new StructuredLogger(`query-${queryName}`, context);
  }

  // Convenience methods
  commandStarted(commandName: string, params: any): void {
    this.info(`Command started: ${commandName}`, { 
      command: commandName, 
      params,
      duration: 0 
    });
  }

  commandCompleted(commandName: string, duration: number): void {
    this.info(`Command completed: ${commandName}`, { 
      command: commandName, 
      duration 
    });
  }

  commandFailed(commandName: string, error: Error, duration: number): void {
    this.error(`Command failed: ${commandName}`, { 
      command: commandName, 
      duration,
      error: error.message 
    }, error);
  }

  queryExecuted(queryName: string, count: number, duration: number): void {
    this.info(`Query executed: ${queryName}`, { 
      query: queryName, 
      resultCount: count,
      duration 
    });
  }
}

// Default logger instance
export const logger = StructuredLogger.forService('iotpilot');
