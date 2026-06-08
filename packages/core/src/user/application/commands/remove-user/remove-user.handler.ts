import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {RemoveUserCommand} from './remove-user.command';
import {UserRepository} from '@iotpilot/core/user/domain/interfaces/user-repository.interface';
import {TenantIsolationEnforcer} from '@iotpilot/core/customer/domain/services/tenant-isolation-enforcer.service';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export interface RemoveUserResult {
    message: string;
    userId: string;
    customerId: string | null;
}

export class RemoveUserHandler implements CommandHandler<RemoveUserCommand, RemoveUserResult> {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly tenantEnforcer: TenantIsolationEnforcer
    ) {}

    async handle(command: RemoveUserCommand): Promise<RemoveUserResult> {
        console.log('🗑️ REMOVE USER HANDLER: Processing command:', {
            userId: command.userId,
            customerId: command.customerId,
            tenantContext: command.getCustomerIdOrNull()?.getValue()
        });

        // Create user ID value object
        const userId = UserId.create(command.userId);

        // Find existing user
        const existingUser = await this.userRepository.findById(userId);
        if (!existingUser) {
            throw new Error(`User with ID ${command.userId} not found`);
        }

        // Validate tenant access
        if (command.customerId) {
            await this.tenantEnforcer.validateTenantAccess(
                CustomerId.create(command.customerId),
                command.getTenantContext()
            );

            // Ensure user belongs to the specified tenant
            if (existingUser.getCustomerId()?.getValue() !== command.customerId) {
                throw new Error('Tenant access violation: User does not belong to specified customer');
            }
        } else if (!command.getTenantContext().isSuperAdminUser()) {
            // Non-superadmin users can only delete users from their own tenant
            const requestingUserCustomerId = command.getCustomerIdOrNull()?.getValue();
            if (existingUser.getCustomerId()?.getValue() !== requestingUserCustomerId) {
                throw new Error('Tenant access violation: Cannot delete user from different customer');
            }
        }

        // Prevent deletion of superadmin users unless by another superadmin
        if (existingUser.getRole().getValue() === 'SUPERADMIN' && 
            !command.getTenantContext().isSuperAdminUser()) {
            throw new Error('Cannot delete superadmin user');
        }

        // Check if this is the last admin in the customer
        if (existingUser.getRole().getValue() === 'ADMIN' && existingUser.getCustomerId()) {
            const adminUsers = await this.userRepository.findAllInTenant(
                CustomerId.create(existingUser.getCustomerId()!.getValue())
            );
            const activeAdmins = adminUsers.filter(user => 
                user.getRole().getValue() === 'ADMIN' && 
                user.isActive
            );

            if (activeAdmins.length <= 1) {
                throw new Error('Cannot delete the last admin user of the organization');
            }
        }

        // Store user info for response before deletion
        const userCustomerId = existingUser.getCustomerId()?.getValue() || null;

        // Delete user
        await this.userRepository.delete(userId);

        console.log('✅ REMOVE USER HANDLER: User removed successfully:', {
            userId: command.userId,
            email: existingUser.getEmail().getValue(),
            role: existingUser.getRole().getValue(),
            customerId: userCustomerId
        });

        return {
            message: 'User removed successfully',
            userId: command.userId,
            customerId: userCustomerId
        };
    }
}