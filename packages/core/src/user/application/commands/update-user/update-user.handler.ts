import {UpdateUserCommand} from './update-user.command';
import {UserRepository} from '../../../domain/interfaces/user-repository.interface';
import {UserEntity} from '../../../domain/entities/user.entity';
import {UserId} from '../../../domain/value-objects/user-id.vo';
import {Email} from '../../../domain/value-objects/email.vo';
import {UserRole} from '../../../../shared/domain/value-objects/user-role.vo';
import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {
    CannotDowngradeSuperadminException,
    EmailAlreadyInUseException,
    UserNotFoundException
} from '../../../domain/exceptions/user.exception';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {UserUpdatedEvent} from '../../../domain/events/user-updated.event';

export class UpdateUserHandler implements CommandHandler<UpdateUserCommand, UserEntity> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: StructuredLogger,
    private readonly eventBus: EventBus
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

    // A SUPERADMIN account can only be touched by another SUPERADMIN — no
    // field, not just role. Without this, the tenant-membership check below
    // is skipped entirely for SUPERADMIN targets (they belong to no tenant),
    // and the role-change guard further down only blocked *assigning*
    // SUPERADMIN, not modifying/demoting an *existing* one — a tenant ADMIN
    // (now allowed to update other users at all) could otherwise edit or
    // demote the platform SUPERADMIN's account with zero restriction.
    if (user.isSuperAdmin() && !tenantContext.isSuperAdmin()) {
      throw new CannotDowngradeSuperadminException(id);
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

      // Cannot demote the last active ADMIN of a tenant — mirrors the same
      // protection in remove-user.handler.ts, extended to cover role changes
      // now that ADMINs (not just SUPERADMIN) can update other members.
      if (user.getRole().getValue() === 'ADMIN' && !newRole.isAdmin() && user.getCustomerId()) {
        const tenantUsers = await this.userRepository.findAllInTenant(user.getCustomerId()!);
        const activeAdmins = tenantUsers.filter(
          (u) => u.getRole().getValue() === 'ADMIN' && u.isActive,
        );
        if (activeAdmins.length <= 1) {
          throw new Error('Cannot demote the last admin user of the organization');
        }
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
    await this.eventBus.publish(new UserUpdatedEvent(user));

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