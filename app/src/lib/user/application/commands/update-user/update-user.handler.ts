import {UpdateUserCommand} from './update-user.command';
import {UserRepository} from '../../../domain/interfaces/user-repository.interface';
import {UserEntity} from '../../../domain/entities/user.entity';
import {UserId} from '../../../domain/value-objects/user-id.vo';
import {Email} from '../../../domain/value-objects/email.vo';
import {UserRole} from '../../../../shared/domain/value-objects/user-role.vo';
import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {
    CannotDowngradeSuperadminException,
    EmailAlreadyInUseException,
    UserNotFoundException
} from '../../../domain/exceptions/user.exception';
import {StructuredLogger} from '@/lib/shared/infrastructure/logging/structured-logger';

export class UpdateUserHandler implements CommandHandler<UpdateUserCommand, UserEntity> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: StructuredLogger
  ) {}

  async handle(command: UpdateUserCommand): Promise<UserEntity> {
    const { 
      userId, 
      email, 
      firstName, 
      lastName, 
      phoneNumber, 
      role, 
      isActive
    } = command;
    const tenantContext = command.getTenantContext();

    if (!tenantContext) {
      throw new Error('Tenant context is required for user update');
    }

    // Find existing user
    const id = UserId.fromString(userId);
    const user = await this.userRepository.findById(id, tenantContext);

    if (!user) {
      throw new UserNotFoundException(id);
    }

    // Validate tenant access
    const customerId = tenantContext.getCustomerId();
    if (customerId && !user.isSuperAdmin()) {
      user.validateBelongsToTenant(customerId);
    }

    // Prevent users from updating themselves unless SUPERADMIN
    const currentUserId = tenantContext.getUserId();
    const isSameUser = currentUserId && currentUserId.getValue() === id.getValue();
    if (isSameUser && !tenantContext.isSuperAdmin()) {
      // Allow self-updates for profile info, but not role or status
      if (role || isActive !== undefined) {
        throw new Error('Cannot update own role or account status');
      }
    }

    // Check email uniqueness if changing email
    if (email && email !== user.email.getValue()) {
      const newEmail = Email.fromString(email);
      const existingUser = await this.userRepository.findByEmail(newEmail, tenantContext);
      
      if (existingUser && existingUser.getId().getValue() !== id.getValue()) {
        throw new EmailAlreadyInUseException(newEmail);
      }
      
      user.updateEmail(newEmail);
    }

    // Update profile information
    if (firstName !== undefined || lastName !== undefined || phoneNumber !== undefined) {
      user.updateProfile(firstName, lastName, phoneNumber);
    }

    // Update role (with permissions check)
    if (role !== undefined) {
      const newRole = UserRole.fromString(role);
      
      // SUPERADMIN can only be assigned by another SUPERADMIN
      if (newRole.isSuperAdmin() && !tenantContext.isSuperAdmin()) {
        throw new CannotDowngradeSuperadminException(id);
      }
      
      // Cannot downgrade own role
      if (isSameUser && user.isSuperAdmin() && !newRole.isSuperAdmin()) {
        throw new CannotDowngradeSuperadminException(id);
      }
      
      user.updateRole(newRole);
    }

    // Update account status
    if (isActive !== undefined) {
      if (isActive) {
        user.activate();
      } else {
        // Only SUPERADMIN can deactivate other users
        if (!tenantContext.isSuperAdmin() && !isSameUser) {
          throw new Error('Only SUPERADMIN can deactivate other users');
        }
        user.deactivate();
      }
    }

    // Save updated user
    await this.userRepository.save(user, tenantContext);

    const changes: string[] = [];
    if (email) changes.push('email');
    if (firstName || lastName || phoneNumber) changes.push('profile');
    if (role) changes.push('role');
    if (isActive !== undefined) changes.push('status');

    this.logger.info('User updated successfully', {
      userId: user.getId().getValue(),
      email: user.getEmail().getValue(),
      changes: changes.join(', '),
      updatedBy: tenantContext.getUserId()?.getValue() || 'system',
      customerId: customerId?.getValue()
    });

    return user;
  }
}