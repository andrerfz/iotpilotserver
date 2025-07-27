import {Injectable} from '@nestjs/common';
import {PrismaService} from '../database/prisma.service';
import {logger} from './logger.service';
import {
    AuditEventType as EnumAuditEventType,
    AuditLogEntry,
    SecurityEventType as EnumSecurityEventType,
    SecurityLogEntry
} from './types';
// Export singleton instance using the shared prisma service
import {prisma as prismaService} from '@/lib/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;

@Injectable()
export class AuditService {
  private readonly prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  private get prisma(): PrismaClient {
    return this.prismaService.getClient();
  }

  /**
   * Log an audit event to the database
   */
  async logAuditEvent(event: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          eventType: this.mapAuditEventType(event.eventType) as any,
          userId: event.userId,
          customerId: event.customerId,
          resource: event.resource,
          action: event.action,
          oldValues: event.oldValues || undefined,
          newValues: event.newValues || undefined,
          success: event.success,
          errorMessage: event.errorMessage || undefined,
          timestamp: event.timestamp,
          correlationId: undefined // TODO: Add correlation ID support
        }
      });

      // Also log to Winston logger
      logger.audit({
        type: event.eventType,
        userId: event.userId,
        customerId: event.customerId,
        resource: event.resource,
        action: event.action,
        oldValues: event.oldValues,
        newValues: event.newValues,
        success: event.success,
        errorMessage: event.errorMessage,
        timestamp: event.timestamp
      });
    } catch (error) {
      // Log the failure but don't throw to avoid breaking the main flow
      logger.error('Failed to log audit event', error instanceof Error ? error : undefined, {
        eventType: event.eventType,
        userId: event.userId,
        resource: event.resource
      });
    }
  }

  /**
   * Log a security event to the database
   */
  async logSecurityEvent(event: SecurityLogEntry): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          eventType: this.mapSecurityEventType(event.eventType) as any,
          severity: event.severity,
          userId: event.userId || undefined,
          customerId: event.customerId || undefined,
          ipAddress: event.ipAddress || undefined,
          userAgent: event.userAgent || undefined,
          resource: event.resource || undefined,
          action: event.action || undefined,
          details: event.details || undefined,
          timestamp: event.timestamp,
          correlationId: undefined // TODO: Add correlation ID support
        }
      });

      // Also log to Winston logger
      logger.security({
        type: event.eventType,
        severity: event.severity,
        userId: event.userId,
        customerId: event.customerId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        resource: event.resource,
        action: event.action,
        details: event.details,
        timestamp: event.timestamp
      });
    } catch (error) {
      // Log the failure but don't throw to avoid breaking the main flow
      logger.error('Failed to log security event', error instanceof Error ? error : undefined, {
        eventType: event.eventType,
        severity: event.severity,
        userId: event.userId
      });
    }
  }

  /**
   * Query audit logs with filtering
   */
  async queryAuditLogs(options: {
    userId?: string;
    customerId?: string;
    eventType?: EnumAuditEventType;
    resource?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (options.userId) where.userId = options.userId;
    if (options.customerId) where.customerId = options.customerId;
    if (options.eventType) where.eventType = this.mapAuditEventType(options.eventType);
    if (options.resource) where.resource = options.resource;
    if (options.success !== undefined) where.success = options.success;

    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }

    return await this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
      include: {
        user: {
          select: { id: true, email: true, username: true }
        },
        customer: {
          select: { id: true, name: true, slug: true }
        }
      }
    });
  }

  /**
   * Query security logs with filtering
   */
  async querySecurityLogs(options: {
    userId?: string;
    customerId?: string;
    eventType?: EnumSecurityEventType;
    severity?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (options.userId) where.userId = options.userId;
    if (options.customerId) where.customerId = options.customerId;
    if (options.eventType) where.eventType = this.mapSecurityEventType(options.eventType);
    if (options.severity) where.severity = options.severity;
    if (options.ipAddress) where.ipAddress = options.ipAddress;

    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }

    return await this.prisma.securityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
      include: {
        user: {
          select: { id: true, email: true, username: true }
        },
        customer: {
          select: { id: true, name: true, slug: true }
        }
      }
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(options: {
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const baseWhere: any = {};
    if (options.customerId) baseWhere.customerId = options.customerId;

    if (options.startDate || options.endDate) {
      baseWhere.timestamp = {};
      if (options.startDate) baseWhere.timestamp.gte = options.startDate;
      if (options.endDate) baseWhere.timestamp.lte = options.endDate;
    }

    const [totalEvents, successfulEvents, failedEvents, eventsByType] = await Promise.all([
      this.prisma.auditLog.count({ where: baseWhere }),
      this.prisma.auditLog.count({ where: { ...baseWhere, success: true } }),
      this.prisma.auditLog.count({ where: { ...baseWhere, success: false } }),
      this.prisma.auditLog.groupBy({
        by: ['eventType'],
        where: baseWhere,
        _count: true
      })
    ]);

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      successRate: totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0,
      eventsByType: eventsByType.map((item: any) => ({
        eventType: item.eventType,
        count: item._count
      }))
    };
  }

  /**
   * Get security statistics
   */
  async getSecurityStatistics(options: {
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const baseWhere: any = {};
    if (options.customerId) baseWhere.customerId = options.customerId;

    if (options.startDate || options.endDate) {
      baseWhere.timestamp = {};
      if (options.startDate) baseWhere.timestamp.gte = options.startDate;
      if (options.endDate) baseWhere.timestamp.lte = options.endDate;
    }

    const [totalEvents, eventsBySeverity, criticalEvents, highSeverityEvents] = await Promise.all([
      this.prisma.securityLog.count({ where: baseWhere }),
      this.prisma.securityLog.groupBy({
        by: ['severity'],
        where: baseWhere,
        _count: true
      }),
      this.prisma.securityLog.count({ where: { ...baseWhere, severity: 'CRITICAL' } }),
      this.prisma.securityLog.count({ where: { ...baseWhere, severity: 'HIGH' } })
    ]);

    return {
      totalEvents,
      criticalEvents,
      highSeverityEvents,
      eventsBySeverity: eventsBySeverity.map((item: any) => ({
        severity: item.severity,
        count: item._count
      }))
    };
  }

  /**
   * Clean up old audit logs (for GDPR compliance)
   */
  async cleanupOldLogs(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const [auditDeleted, securityDeleted] = await Promise.all([
      this.prisma.auditLog.deleteMany({
        where: { timestamp: { lt: cutoffDate } }
      }),
      this.prisma.securityLog.deleteMany({
        where: { timestamp: { lt: cutoffDate } }
      })
    ]);

    const totalDeleted = auditDeleted.count + securityDeleted.count;

    logger.info(`Cleaned up ${totalDeleted} old log entries`, {
      auditDeleted: auditDeleted.count,
      securityDeleted: securityDeleted.count,
      olderThanDays
    });

    return totalDeleted;
  }

  private mapAuditEventType(type: EnumAuditEventType): string {
    return type;
  }

  private mapSecurityEventType(type: EnumSecurityEventType): string {
    return type;
  }
}

// Factory function for creating AuditService with proper DI
export function createAuditService(prismaService: PrismaService): AuditService {
  return new AuditService(prismaService);
}

export const auditService = new AuditService(prismaService);
