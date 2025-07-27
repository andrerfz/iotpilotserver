import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {Email} from '../../../domain/value-objects/email.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

export class RegisterUserCommand extends TenantAwareCommand {
  /** Static type identifier that survives minification */
  static readonly type = 'RegisterUserCommand';

  constructor(
    tenantContext: TenantContext,
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly phoneNumber?: string,
    public readonly role?: string
  ) {
    super(tenantContext);
  }

  static fromRequest(request: any, tenantContext: TenantContext): RegisterUserCommand {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phoneNumber, 
      role = 'USER' 
    } = request.body;

    // Basic validation
    if (!email || !password || !firstName) {
      throw new Error('Email, password, and first name are required');
    }

    return new RegisterUserCommand(
      tenantContext,
      email, 
      password, 
      firstName, 
      lastName, 
      phoneNumber, 
      role
    );
  }

  // Factory method to create with validated value objects
  static create(
    tenantContext: TenantContext,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    customerId: string,
    phoneNumber?: string,
    role: string = 'USER'
  ): RegisterUserCommand {
    // Validate email format
    try {
      Email.fromString(email);
    } catch (error) {
      throw new Error('Invalid email format');
    }

    // Validate customer ID
    try {
      CustomerId.fromString(customerId);
    } catch (error) {
      throw new Error('Invalid customer ID format');
    }

    // Basic password validation
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    return new RegisterUserCommand(
      tenantContext,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role
    );
  }
}
