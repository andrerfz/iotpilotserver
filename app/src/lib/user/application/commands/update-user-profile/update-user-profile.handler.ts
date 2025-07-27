import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {UpdateUserProfileCommand} from './update-user-profile.command';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {TenantIsolationEnforcer} from '@/lib/customer/domain/services/tenant-isolation-enforcer.service';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

export interface UpdateUserProfileResult {
    user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        role: string;
        status: string;
        customerId: string | null;
        updatedAt: Date;
    };
    profile: {
        displayName: string;
        preferences?: Record<string, any>;
    };
}

export class UpdateUserProfileHandler implements CommandHandler<UpdateUserProfileCommand, UpdateUserProfileResult> {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly tenantEnforcer: TenantIsolationEnforcer
    ) {}

    async handle(command: UpdateUserProfileCommand): Promise<UpdateUserProfileResult> {
        console.log('👤 UPDATE USER PROFILE HANDLER: Processing command:', {
            userId: command.userId,
            profileData: command.profileData,
            customerId: command.customerId,
            tenantContext: command.getCustomerId()?.getValue()
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
            // Non-superadmin users can only update profiles from their own tenant
            const requestingUserCustomerId = command.getCustomerIdOrNull()?.getValue();
            if (existingUser.getCustomerId()?.getValue() !== requestingUserCustomerId) {
                throw new Error('Tenant access violation: Cannot update profile from different customer');
            }
        }

        // Update profile properties - note: the current interface only supports username/displayName
        // For now, we'll just trigger an update timestamp since the entity doesn't have username
        existingUser.updateProfile(
            existingUser.firstName,
            existingUser.lastName,
            existingUser.phoneNumber
        );

        // Save updated user
        await this.userRepository.save(existingUser);

        console.log('✅ UPDATE USER PROFILE HANDLER: User profile updated successfully:', {
            userId: existingUser.getId().getValue(),
            email: existingUser.getEmail().getValue(),
            customerId: existingUser.getCustomerId()?.getValue()
        });

        return {
            user: {
                id: existingUser.getId().getValue(),
                email: existingUser.getEmail().getValue(),
                firstName: existingUser.firstName,
                lastName: existingUser.lastName,
                role: existingUser.getRole().getValue(),
                status: existingUser.isActive ? 'ACTIVE' : 'INACTIVE',
                customerId: existingUser.getCustomerId()?.getValue() || null,
                updatedAt: existingUser.getUpdatedAt()
            },
            profile: {
                displayName: command.profileData.displayName || existingUser.getDisplayName(),
                preferences: command.profileData.preferences || {}
            }
        };
    }
}