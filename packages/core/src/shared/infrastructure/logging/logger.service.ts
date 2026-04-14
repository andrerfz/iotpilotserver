import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import {AuditEventType, SecurityEventType} from './types';

export interface LogContext {
  userId?: string;
  customerId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  [key: string]: any;
}

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  customerId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface AuditEvent {
  type: AuditEventType;
  userId: string;
  customerId?: string;
  resource: string;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

/**
 * Production logging service using Winston for structured logging.
 * Provides hierarchical logging levels, daily log rotation, and security event tracking.
 * Automatically handles log formatting, file rotation, and error context enrichment.
 */
export class LoggerService {
  private logger!: winston.Logger;
  private securityLogger!: winston.Logger;
  private auditLogger!: winston.Logger;

  constructor() {
    this.initializeLoggers();
  }

  private initializeLoggers(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

    // Main application logger
    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'iot-pilot-server' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // Daily rotating file for application logs
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.json()
        }),

        // Error log file
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.json()
        })
      ]
    });

    // Security events logger
    this.securityLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'iot-pilot-security' },
      transports: [
        new DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '90d', // Keep security logs longer
          format: winston.format.json()
        }),

        // Also log security events to main log
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'warn',
          format: winston.format.json()
        })
      ]
    });

    // Audit trail logger
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'iot-pilot-audit' },
      transports: [
        new DailyRotateFile({
          filename: 'logs/audit-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '365d', // Keep audit logs for 1 year
          format: winston.format.json()
        })
      ]
    });
  }

  // Application logging methods

  /**
   * Logs debug-level messages for development and troubleshooting.
   * @param message The log message
   * @param context Additional context data for the log entry
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  /**
   * Logs info-level messages for general application flow.
   * @param message The log message
   * @param context Additional context data for the log entry
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  /**
   * Logs warning messages for non-critical issues.
   * @param message The log message
   * @param context Additional context data for the log entry
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  /**
   * Logs error messages with automatic error context enrichment.
   * @param message The log message
   * @param error The error object (automatically extracts stack trace and message)
   * @param context Additional context data for the log entry
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const logData = {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };

    this.logger.error(message, logData);
  }

  /**
   * Logs security events with appropriate severity levels.
   * Critical security events are also logged to the main application logger.
   * @param event The security event to log
   */
  security(event: SecurityEvent): void {
    const logData = {
      ...event,
      timestamp: event.timestamp.toISOString()
    };

    // Log based on severity
    const level = this.getLogLevelForSeverity(event.severity);
    this.securityLogger.log(level, `Security Event: ${event.type}`, logData);

    // Also log critical security events to main logger
    if (event.severity === 'CRITICAL') {
      this.logger.error(`CRITICAL SECURITY EVENT: ${event.type}`, logData);
    }
  }

  // Audit trail logging
  audit(event: AuditEvent): void {
    const logData = {
      ...event,
      timestamp: event.timestamp.toISOString(),
      eventType: 'AUDIT'
    };

    this.auditLogger.info(`Audit: ${event.type}`, logData);

    // Also log failed operations to main logger
    if (!event.success) {
      this.logger.warn(`Audit: Failed ${event.action} on ${event.resource}`, {
        userId: event.userId,
        customerId: event.customerId,
        errorMessage: event.errorMessage
      });
    }
  }

  // Convenience methods for common security events

  /**
   * Logs login attempts (successful or failed) with security event categorization.
   * @param userId The user ID (or 'unknown' for failed attempts)
   * @param customerId The customer/tenant ID
   * @param ipAddress The client's IP address
   * @param success Whether the login attempt was successful
   * @param userAgent The client's user agent string
   */
  logLoginAttempt(userId: string, customerId: string | undefined, ipAddress: string, success: boolean, userAgent?: string): void {
    this.security({
      type: success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
      severity: success ? 'LOW' : 'MEDIUM',
      userId,
      customerId,
      ipAddress,
      userAgent,
      resource: 'authentication',
      action: 'login',
      details: { success },
      timestamp: new Date()
    });
  }

  logPasswordChange(userId: string, customerId: string | undefined, ipAddress: string, success: boolean): void {
    this.security({
      type: success ? SecurityEventType.PASSWORD_RESET_SUCCESS : SecurityEventType.PASSWORD_RESET_FAILURE,
      severity: success ? 'LOW' : 'HIGH',
      userId,
      customerId,
      ipAddress,
      resource: 'user',
      action: 'password_change',
      details: { success },
      timestamp: new Date()
    });
  }

  /**
   * Logs tenant boundary violations - CRITICAL security events.
   * These indicate attempts to access data from other tenants.
   * @param userId The user attempting the violation
   * @param attemptedCustomerId The tenant ID the user tried to access
   * @param actualCustomerId The user's actual tenant ID
   * @param resource The resource being accessed
   * @param ipAddress The client's IP address
   */
  logTenantViolation(userId: string, attemptedCustomerId: string, actualCustomerId: string, resource: string, ipAddress: string): void {
    this.security({
      type: SecurityEventType.TENANT_BOUNDARY_VIOLATION,
      severity: 'CRITICAL',
      userId,
      customerId: actualCustomerId,
      ipAddress,
      resource,
      action: 'access_violation',
      details: {
        attemptedCustomerId,
        actualCustomerId,
        violation: 'cross_tenant_access'
      },
      timestamp: new Date()
    });
  }

  logSuperAdminAction(userId: string, action: string, resource: string, details?: Record<string, any>): void {
    this.security({
      type: SecurityEventType.SUPERADMIN_ACTION,
      severity: 'MEDIUM',
      userId,
      ipAddress: 'system',
      resource,
      action,
      details: { ...details, superAdmin: true },
      timestamp: new Date()
    });
  }

  // Audit trail methods
  auditUserCreation(userId: string, createdBy: string, customerId?: string, ipAddress?: string): void {
    this.audit({
      type: AuditEventType.USER_CREATED,
      userId: createdBy,
      customerId,
      resource: 'user',
      action: 'create',
      newValues: { userId },
      ipAddress,
      success: true,
      timestamp: new Date()
    });
  }

  auditDeviceCreation(deviceId: string, userId: string, customerId: string, ipAddress?: string): void {
    this.audit({
      type: AuditEventType.DEVICE_CREATED,
      userId,
      customerId,
      resource: 'device',
      action: 'create',
      newValues: { deviceId },
      ipAddress,
      success: true,
      timestamp: new Date()
    });
  }

  auditDeviceCommand(commandId: string, deviceId: string, userId: string, customerId: string, command: string, success: boolean, ipAddress?: string): void {
    this.audit({
      type: AuditEventType.DEVICE_COMMAND_EXECUTED,
      userId,
      customerId,
      resource: 'device_command',
      action: 'execute',
      newValues: { commandId, deviceId, command, success },
      ipAddress,
      success,
      timestamp: new Date()
    });
  }

  private getLogLevelForSeverity(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warn';
      case 'LOW': return 'info';
      default: return 'info';
    }
  }

  // Request context logging
  createRequestLogger(requestId: string, correlationId?: string) {
    return {
      debug: (message: string, context?: LogContext) =>
        this.debug(message, { ...context, requestId, correlationId }),
      info: (message: string, context?: LogContext) =>
        this.info(message, { ...context, requestId, correlationId }),
      warn: (message: string, context?: LogContext) =>
        this.warn(message, { ...context, requestId, correlationId }),
      error: (message: string, error?: Error, context?: LogContext) =>
        this.error(message, error, { ...context, requestId, correlationId }),
      security: (event: SecurityEvent) => this.security(event),
      audit: (event: AuditEvent) => this.audit(event)
    };
  }
}

// Export singleton instance
export const logger = new LoggerService();
