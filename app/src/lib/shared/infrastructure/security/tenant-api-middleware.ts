import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { TenantContext } from '../../../application/context/tenant-context.vo';
import { TenantContextProvider } from '../../../application/context/tenant-context-provider.service';
import { TenantScopedLoggingService } from '../logging/tenant-scoped-logging.service';
import { tenantPrisma, withTenant } from '../../../../../tenant-middleware';
import { CustomerId } from '../../../../customer/domain/value-objects/customer-id.vo';
import { UserId } from '../../../../user/domain/value-objects/user-id.vo';
import { UserRole as UserRoleVO } from '../../../../user/domain/value-objects/user-role.vo';

/**
 * Middleware for handling tenant context in API requests
 */
@Injectable()
export class TenantApiMiddleware implements NestMiddleware {
  private prisma: PrismaClient;

  constructor(
    private readonly tenantContextProvider: TenantContextProvider,
    private readonly loggingService: TenantScopedLoggingService
  ) {
    this.prisma = tenantPrisma.client;
  }

  /**
   * Process the request and set up tenant context
   * @param req The request object
   * @param res The response object
   * @param next The next function
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract user information from the request
      // This assumes authentication middleware has already run
      const userId = this.extractUserId(req);
      
      if (!userId) {
        // No authenticated user, proceed without tenant context
        return next();
      }

      // Get user from database to determine role and customer ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        // User not found, proceed without tenant context
        return next();
      }

      // Create tenant context
      const tenantContext = await this.createTenantContext(user, req);

      // Run the rest of the request with tenant context
      await withTenant(tenantContext, async () => {
        // Log the request with tenant context
        this.logRequest(req, tenantContext);

        // Add tenant context to request for use in controllers
        (req as any).tenantContext = tenantContext;

        // Continue processing the request
        next();
      });
    } catch (error) {
      // Log the error
      console.error('Error in tenant middleware:', error);
      
      // Continue without tenant context
      next();
    }
  }

  /**
   * Extract user ID from the request
   * @param req The request object
   * @returns The user ID or null if not authenticated
   */
  private extractUserId(req: Request): string | null {
    // This implementation depends on your authentication strategy
    // It could extract from JWT token, session, etc.
    
    // Example: Extract from authenticated user object
    if ((req as any).user && (req as any).user.id) {
      return (req as any).user.id;
    }
    
    // Example: Extract from authorization header with JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real implementation, you would decode and verify the JWT
      // For now, we'll just return null
      return null;
    }
    
    return null;
  }

  /**
   * Create tenant context from user information
   * @param user The user object from the database
   * @param req The request object
   * @returns The tenant context
   */
  private async createTenantContext(
    user: { id: string; customerId: string | null; role: UserRole },
    req: Request
  ): Promise<TenantContext> {
    // Check if user is SUPERADMIN
    const isSuperAdmin = user.role === 'SUPERADMIN';
    
    // For SUPERADMIN, check if a specific tenant is requested
    let customerId: CustomerId | null = null;
    
    if (user.customerId) {
      customerId = CustomerId.create(user.customerId);
    } else if (isSuperAdmin) {
      // SUPERADMIN can specify a tenant in the request
      const requestedTenantId = this.extractRequestedTenantId(req);
      
      if (requestedTenantId) {
        // Verify the requested tenant exists
        const tenantExists = await this.tenantExists(requestedTenantId);
        
        if (tenantExists) {
          customerId = CustomerId.create(requestedTenantId);
        }
      }
    }
    
    // Create and return the tenant context
    return this.tenantContextProvider.createContext(
      customerId,
      UserId.create(user.id),
      UserRoleVO.create(user.role),
      isSuperAdmin
    );
  }

  /**
   * Extract requested tenant ID from the request
   * @param req The request object
   * @returns The requested tenant ID or null
   */
  private extractRequestedTenantId(req: Request): string | null {
    // Check query parameter
    if (req.query.tenantId && typeof req.query.tenantId === 'string') {
      return req.query.tenantId;
    }
    
    // Check header
    const tenantHeader = req.headers['x-tenant-id'];
    if (tenantHeader && typeof tenantHeader === 'string') {
      return tenantHeader;
    }
    
    // Check path parameter
    // This assumes routes with tenant ID follow pattern /api/tenants/:tenantId/...
    if (req.params.tenantId) {
      return req.params.tenantId;
    }
    
    return null;
  }

  /**
   * Check if a tenant exists
   * @param tenantId The tenant ID to check
   * @returns True if the tenant exists, false otherwise
   */
  private async tenantExists(tenantId: string): Promise<boolean> {
    const count = await this.prisma.customer.count({
      where: { id: tenantId }
    });
    
    return count > 0;
  }

  /**
   * Log the API request with tenant context
   * @param req The request object
   * @param tenantContext The tenant context
   */
  private logRequest(req: Request, tenantContext: TenantContext): void {
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    this.loggingService.info(
      `API Request: ${method} ${url}`,
      tenantContext,
      {
        method,
        url,
        ip,
        userAgent,
        params: req.params,
        query: req.query,
        body: this.sanitizeRequestBody(req.body)
      }
    );
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   * @param body The request body
   * @returns Sanitized body for logging
   */
  private sanitizeRequestBody(body: any): any {
    if (!body) {
      return {};
    }
    
    // Create a copy of the body
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}