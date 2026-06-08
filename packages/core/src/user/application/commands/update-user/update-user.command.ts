import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export class UpdateUserCommand extends TenantAwareCommand {
  constructor(
    tenantContext: TenantContext,
    public readonly userId: string,
    public readonly email?: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly phoneNumber?: string,
    public readonly role?: string,
    public readonly isActive?: boolean
  ) {
    super(tenantContext);
  }

  static fromRequest(request: any, tenantContext: TenantContext): UpdateUserCommand {
    const { 
      userId, 
      email, 
      firstName, 
      lastName, 
      phoneNumber, 
      role, 
      isActive 
    } = request.body;

    if (!userId) {
      throw new Error('User ID is required');
    }

    return new UpdateUserCommand(
      tenantContext,
      userId,
      email,
      firstName,
      lastName,
      phoneNumber,
      role,
      isActive
    );
  }

  // Validation method
  validate(): void {
    if (this.email && !this.isValidEmail(this.email)) {
      throw new Error('Invalid email format');
    }

    if (this.role && !['USER', 'ADMIN', 'SUPERADMIN'].includes(this.role.toUpperCase())) {
      throw new Error('Invalid role specified');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}