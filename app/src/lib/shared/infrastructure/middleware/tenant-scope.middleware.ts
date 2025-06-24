import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextProvider } from '@/lib/shared/application/context/tenant-context-provider.service';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { UserId } from '@/lib/user/domain/value-objects/user-id.vo';
import { UserRole } from '@/lib/user/domain/value-objects/user-role.vo';

@Injectable()
export class TenantScopeMiddleware implements NestMiddleware {
  constructor(private readonly tenantContextProvider: TenantContextProvider) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Clear any existing context
      this.tenantContextProvider.clearCurrentContext();

      // Extract user information from the request
      // This would typically come from JWT token or session
      const userId = this.extractUserId(req);
      const role = this.extractUserRole(req);
      const customerId = this.extractCustomerId(req);
      const isSuperAdmin = this.isSuperAdmin(req);

      // Create and set the tenant context
      if (userId && role) {
        const context = this.tenantContextProvider.createContext(
          userId,
          role,
          customerId,
          isSuperAdmin
        );

        // Optionally attach the context to the request for easier access in controllers
        (req as any).tenantContext = context;
      }

      next();
    } catch (error) {
      // Log the error but don't block the request
      console.error('Error setting up tenant context:', error);
      next();
    }
  }

  private extractUserId(req: Request): UserId | null {
    // In a real implementation, this would extract the user ID from the JWT token or session
    // For now, we'll use a header for demonstration purposes
    const userIdStr = req.headers['x-user-id'] as string;
    return userIdStr ? new UserId(userIdStr) : null;
  }

  private extractUserRole(req: Request): UserRole | null {
    // In a real implementation, this would extract the role from the JWT token or session
    // For now, we'll use a header for demonstration purposes
    const roleStr = req.headers['x-user-role'] as string;
    return roleStr ? UserRole.create(roleStr) : null;
  }

  private extractCustomerId(req: Request): CustomerId | null {
    // In a real implementation, this would extract the customer ID from the JWT token or session
    // For now, we'll use a header for demonstration purposes
    const customerIdStr = req.headers['x-customer-id'] as string;
    return customerIdStr ? new CustomerId(customerIdStr) : null;
  }

  private isSuperAdmin(req: Request): boolean {
    // In a real implementation, this would check if the user is a super admin based on the JWT token or session
    // For now, we'll use a header for demonstration purposes
    return req.headers['x-super-admin'] === 'true';
  }
}