import { Injectable } from '@nestjs/common';
import { CustomerId } from '../../../../customer/domain/value-objects/customer-id.vo';
import { TenantContext } from '../../../application/context/tenant-context.vo';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  tenantId: string | null;
  userId: string | null;
  metadata?: Record<string, any>;
}

@Injectable()
export class TenantScopedLoggingService {
  private logEntries: LogEntry[] = [];
  
  /**
   * Log a message with tenant context
   * @param level The log level
   * @param message The log message
   * @param tenantContext The tenant context
   * @param metadata Additional metadata to include in the log
   */
  log(level: LogLevel, message: string, tenantContext: TenantContext, metadata?: Record<string, any>): void {
    const tenantId = this.getTenantIdFromContext(tenantContext);
    const userId = tenantContext.getUserId()?.getValue() || null;
    
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      tenantId,
      userId,
      metadata
    };
    
    this.logEntries.push(logEntry);
    
    // Also output to console for development purposes
    this.outputToConsole(logEntry);
  }
  
  /**
   * Log a debug message
   * @param message The log message
   * @param tenantContext The tenant context
   * @param metadata Additional metadata to include in the log
   */
  debug(message: string, tenantContext: TenantContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, tenantContext, metadata);
  }
  
  /**
   * Log an info message
   * @param message The log message
   * @param tenantContext The tenant context
   * @param metadata Additional metadata to include in the log
   */
  info(message: string, tenantContext: TenantContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, tenantContext, metadata);
  }
  
  /**
   * Log a warning message
   * @param message The log message
   * @param tenantContext The tenant context
   * @param metadata Additional metadata to include in the log
   */
  warn(message: string, tenantContext: TenantContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, tenantContext, metadata);
  }
  
  /**
   * Log an error message
   * @param message The log message
   * @param tenantContext The tenant context
   * @param metadata Additional metadata to include in the log
   */
  error(message: string, tenantContext: TenantContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, tenantContext, metadata);
  }
  
  /**
   * Log a critical message
   * @param message The log message
   * @param tenantContext The tenant context
   * @param metadata Additional metadata to include in the log
   */
  critical(message: string, tenantContext: TenantContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, message, tenantContext, metadata);
  }
  
  /**
   * Get all log entries for a specific tenant
   * @param tenantContext The tenant context
   * @returns Array of log entries for the tenant
   */
  getLogsByTenant(tenantContext: TenantContext): LogEntry[] {
    const tenantId = this.getTenantIdFromContext(tenantContext);
    
    // SUPERADMIN can see all logs
    if (tenantContext.canBypassTenantRestrictions()) {
      return [...this.logEntries];
    }
    
    // Regular users can only see logs for their tenant
    return this.logEntries.filter(entry => entry.tenantId === tenantId);
  }
  
  /**
   * Clear all logs for a specific tenant
   * @param tenantContext The tenant context
   */
  clearTenantLogs(tenantContext: TenantContext): void {
    const tenantId = this.getTenantIdFromContext(tenantContext);
    
    // SUPERADMIN can clear all logs
    if (tenantContext.canBypassTenantRestrictions()) {
      this.logEntries = [];
      return;
    }
    
    // Regular users can only clear logs for their tenant
    this.logEntries = this.logEntries.filter(entry => entry.tenantId !== tenantId);
  }
  
  /**
   * Get the tenant ID from the tenant context
   * @param tenantContext The tenant context
   * @returns The tenant ID as a string or null for SUPERADMIN
   */
  private getTenantIdFromContext(tenantContext: TenantContext): string | null {
    // For SUPERADMIN without a specific tenant context, use null
    if (tenantContext.canBypassTenantRestrictions() && !tenantContext.requiresTenantScope()) {
      return null;
    }
    
    // Get the customer ID from the tenant context
    const customerId = tenantContext.getCustomerId();
    
    if (!customerId) {
      return null;
    }
    
    return customerId.getValue();
  }
  
  /**
   * Output a log entry to the console
   * @param logEntry The log entry to output
   */
  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const tenantInfo = logEntry.tenantId ? `[Tenant: ${logEntry.tenantId}]` : '[SYSTEM]';
    const userInfo = logEntry.userId ? `[User: ${logEntry.userId}]` : '';
    
    let consoleMethod: 'log' | 'info' | 'warn' | 'error' = 'log';
    
    switch (logEntry.level) {
      case LogLevel.DEBUG:
        consoleMethod = 'log';
        break;
      case LogLevel.INFO:
        consoleMethod = 'info';
        break;
      case LogLevel.WARN:
        consoleMethod = 'warn';
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        consoleMethod = 'error';
        break;
    }
    
    console[consoleMethod](
      `${timestamp} ${logEntry.level} ${tenantInfo} ${userInfo} ${logEntry.message}`,
      logEntry.metadata || ''
    );
  }
}