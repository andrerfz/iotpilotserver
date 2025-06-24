import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { TenantScopedLoggingService } from '../logging/tenant-scoped-logging.service';
import { tenantPrisma } from '@/lib/tenant-middleware';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Audit event types for security-related events
 */
export enum AuditEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_USED = 'API_KEY_USED',
  API_KEY_DELETED = 'API_KEY_DELETED',
  TENANT_ACCESS = 'TENANT_ACCESS',
  CROSS_TENANT_ATTEMPT = 'CROSS_TENANT_ATTEMPT',
  ADMIN_ACTION = 'ADMIN_ACTION',
  SUPERADMIN_ACTION = 'SUPERADMIN_ACTION',
  SECURITY_SETTING_CHANGED = 'SECURITY_SETTING_CHANGED',
  DATA_EXPORT = 'DATA_EXPORT',
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS'
}

/**
 * Interface for audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId: string | null;
  tenantId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  action: string;
  status: 'SUCCESS' | 'FAILURE';
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, any> | null;
}

/**
 * Service for logging security audit events with tenant context
 */
@Injectable()
export class TenantAuditLogger {
  private prisma: PrismaClient;

  constructor(private readonly loggingService: TenantScopedLoggingService) {
    this.prisma = tenantPrisma.client;
  }

  /**
   * Log an audit event
   * @param eventType The type of audit event
   * @param action The action being performed
   * @param status The status of the action (success or failure)
   * @param tenantContext The tenant context
   * @param options Additional options for the audit log
   */
  async logAuditEvent(
    eventType: AuditEventType,
    action: string,
    status: 'SUCCESS' | 'FAILURE',
    tenantContext: TenantContext,
    options: {
      resourceType?: string;
      resourceId?: string;
      ipAddress?: string;
      userAgent?: string;
      details?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const userId = tenantContext.getUserId()?.getValue() || null;
      const tenantId = tenantContext.getCustomerId()?.getValue() || null;

      // Create audit log entry
      const auditLog: AuditLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType,
        userId,
        tenantId,
        resourceType: options.resourceType || null,
        resourceId: options.resourceId || null,
        action,
        status,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        details: options.details || null
      };

      // Log to database
      await this.saveAuditLog(auditLog);

      // Also log to application logs
      this.logToApplicationLogs(auditLog, tenantContext);
    } catch (error) {
      // If audit logging fails, log the error but don't throw
      console.error('Error logging audit event:', error);

      // Try to log to application logs
      this.loggingService.error(
        `Failed to log audit event: ${eventType} - ${action}`,
        tenantContext,
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Log a successful login
   * @param userId The user ID
   * @param tenantContext The tenant context
   * @param ipAddress The IP address
   * @param userAgent The user agent
   */
  async logLoginSuccess(
    userId: string,
    tenantContext: TenantContext,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAuditEvent(
      AuditEventType.LOGIN_SUCCESS,
      'User login',
      'SUCCESS',
      tenantContext,
      {
        resourceType: 'user',
        resourceId: userId,
        ipAddress,
        userAgent
      }
    );
  }

  /**
   * Log a failed login attempt
   * @param email The email that was used
   * @param reason The reason for failure
   * @param tenantContext The tenant context
   * @param ipAddress The IP address
   * @param userAgent The user agent
   */
  async logLoginFailure(
    email: string,
    reason: string,
    tenantContext: TenantContext,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAuditEvent(
      AuditEventType.LOGIN_FAILURE,
      'Failed login attempt',
      'FAILURE',
      tenantContext,
      {
        details: { email, reason },
        ipAddress,
        userAgent
      }
    );
  }

  /**
   * Log a cross-tenant access attempt
   * @param sourceUserId The user ID attempting access
   * @param sourceTenantId The tenant ID of the user
   * @param targetTenantId The tenant ID being accessed
   * @param resource The resource being accessed
   * @param tenantContext The tenant context
   * @param ipAddress The IP address
   */
  async logCrossTenantAttempt(
    sourceUserId: string,
    sourceTenantId: string,
    targetTenantId: string,
    resource: string,
    tenantContext: TenantContext,
    ipAddress?: string
  ): Promise<void> {
    await this.logAuditEvent(
      AuditEventType.CROSS_TENANT_ATTEMPT,
      'Cross-tenant access attempt',
      'FAILURE',
      tenantContext,
      {
        resourceType: 'tenant',
        resourceId: targetTenantId,
        details: {
          sourceUserId,
          sourceTenantId,
          targetTenantId,
          resource
        },
        ipAddress
      }
    );
  }

  /**
   * Log a SUPERADMIN action
   * @param action The action performed
   * @param resourceType The type of resource
   * @param resourceId The ID of the resource
   * @param details Additional details
   * @param tenantContext The tenant context
   */
  async logSuperAdminAction(
    action: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any>,
    tenantContext: TenantContext
  ): Promise<void> {
    await this.logAuditEvent(
      AuditEventType.SUPERADMIN_ACTION,
      action,
      'SUCCESS',
      tenantContext,
      {
        resourceType,
        resourceId,
        details
      }
    );
  }

  /**
   * Log sensitive data access
   * @param dataType The type of sensitive data
   * @param resourceId The ID of the resource
   * @param reason The reason for access
   * @param tenantContext The tenant context
   */
  async logSensitiveDataAccess(
    dataType: string,
    resourceId: string,
    reason: string,
    tenantContext: TenantContext
  ): Promise<void> {
    await this.logAuditEvent(
      AuditEventType.SENSITIVE_DATA_ACCESS,
      'Sensitive data access',
      'SUCCESS',
      tenantContext,
      {
        resourceType: dataType,
        resourceId,
        details: { reason }
      }
    );
  }

  /**
   * Get audit logs for a specific tenant
   * @param tenantId The tenant ID
   * @param filters Optional filters for the logs
   * @param tenantContext The tenant context
   * @returns Array of audit log entries
   */
  async getAuditLogs(
    tenantId: CustomerId,
    filters: {
      eventType?: AuditEventType;
      userId?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      status?: 'SUCCESS' | 'FAILURE';
    },
    tenantContext: TenantContext
  ): Promise<AuditLogEntry[]> {
    // Validate tenant access
    if (!tenantContext.canBypassTenantRestrictions()) {
      const customerId = tenantContext.getCustomerId();
      if (!customerId || !customerId.equals(tenantId)) {
        throw new Error('Access denied to tenant audit logs');
      }
    }

    // In development mode, return empty array since auditLog model doesn't exist yet
    console.log(`[MOCK] getAuditLogs called for tenant ${tenantId.getValue()} with filters:`, filters);

    return [];
  }

  /**
   * Save audit log to database
   * @param auditLog The audit log entry
   */
  private async saveAuditLog(auditLog: AuditLogEntry): Promise<void> {
    // In development mode, just log to console since auditLog model doesn't exist yet
    console.log('[MOCK] saveAuditLog called with:', {
      id: auditLog.id,
      timestamp: auditLog.timestamp,
      eventType: auditLog.eventType,
      userId: auditLog.userId,
      tenantId: auditLog.tenantId,
      action: auditLog.action,
      status: auditLog.status
    });
  }

  /**
   * Log audit event to application logs
   * @param auditLog The audit log entry
   * @param tenantContext The tenant context
   */
  private logToApplicationLogs(
    auditLog: AuditLogEntry,
    tenantContext: TenantContext
  ): void {
    const message = `AUDIT: ${auditLog.eventType} - ${auditLog.action} - ${auditLog.status}`;

    if (auditLog.status === 'FAILURE') {
      this.loggingService.warn(message, tenantContext, auditLog);
    } else {
      this.loggingService.info(message, tenantContext, auditLog);
    }
  }
}
