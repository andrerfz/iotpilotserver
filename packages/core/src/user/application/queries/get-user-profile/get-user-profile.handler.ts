import {QueryHandler} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {GetUserProfileQuery} from './get-user-profile.query';
import {UserRepository} from '@iotpilot/core/user/domain/interfaces/user-repository.interface';
import {TenantIsolationEnforcer} from '@iotpilot/core/customer/domain/services/tenant-isolation-enforcer.service';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserRoleType} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';

export interface UserProfileResult {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    status: string;
    customerId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    profile: {
        displayName: string;
        preferences?: Record<string, any>;
    };
    permissions: {
        canManageDevices: boolean;
        canManageUsers: boolean;
        canViewAnalytics: boolean;
        canManageSystem: boolean;
    };
}

export class GetUserProfileHandler implements QueryHandler<GetUserProfileQuery, UserProfileResult> {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly tenantEnforcer: TenantIsolationEnforcer
    ) {}

    async handle(query: GetUserProfileQuery): Promise<UserProfileResult> {
        console.log('👤 GET USER PROFILE HANDLER: Processing query:', {
            userId: query.userId,
            customerId: query.customerId,
            tenantContext: query.getTenantContext().getCustomerId()?.getValue()
        });

        // Create user ID value object
        const userId = UserId.create(query.userId);

        // Find user by ID
        const user = await this.userRepository.findById(userId);
        
        if (!user) {
            throw new Error(`User with ID ${query.userId} not found`);
        }

        // Validate tenant access
        if (query.customerId) {
            await this.tenantEnforcer.validateTenantAccess(
                CustomerId.create(query.customerId),
                query.getTenantContext()
            );

            // Ensure user belongs to the specified tenant
            if (user.getCustomerId()?.getValue() !== query.customerId) {
                throw new Error('Tenant access violation: User does not belong to specified customer');
            }
        } else if (!query.getTenantContext().isSuperAdminUser()) {
            // Non-superadmin users can only access profiles from their own tenant
            const requestingUserCustomerId = query.getTenantContext().getCustomerId()?.getValue();
            if (user.getCustomerId()?.getValue() !== requestingUserCustomerId) {
                throw new Error('Tenant access violation: Cannot access profile from different customer');
            }
        }

        console.log('✅ GET USER PROFILE HANDLER: User profile retrieved successfully:', {
            userId: user.getId().getValue(),
            email: user.getEmail().getValue(),
            role: user.getRole().getValue(),
            customerId: user.getCustomerId()?.getValue()
        });

        // Calculate permissions based on role
        const role = user.getRole().getValue();
        const permissions = {
            canManageDevices: ['ADMIN', 'SUPERADMIN'].includes(role as UserRoleType),
            canManageUsers: ['SUPERADMIN'].includes(role as UserRoleType) || (role === 'ADMIN' && !!user.getCustomerId()),
            canViewAnalytics: ['ADMIN', 'SUPERADMIN'].includes(role as UserRoleType),
            canManageSystem: ['SUPERADMIN'].includes(role as UserRoleType)
        };

        return {
            id: user.getId().getValue(),
            email: user.getEmail().getValue(),
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.getRole().getValue(),
            status: user.isActive ? 'ACTIVE' : 'INACTIVE',
            customerId: user.getCustomerId()?.getValue() || null,
            createdAt: user.getCreatedAt(),
            updatedAt: user.getUpdatedAt(),
            lastLoginAt: user.lastLogin || null,
            profile: {
                displayName: user.getDisplayName(),
                preferences: {}
            },
            permissions
        };
    }
}