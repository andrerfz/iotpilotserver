import {QueryHandler} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {GetUserByIdQuery} from './get-user-by-id.query';
import {UserEntity} from '@iotpilot/core/user/domain/entities/user.entity';
import {UserRepository} from '@iotpilot/core/user/domain/interfaces/user-repository.interface';
import {TenantIsolationEnforcer} from '@iotpilot/core/customer/domain/services/tenant-isolation-enforcer.service';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class GetUserByIdHandler implements QueryHandler<GetUserByIdQuery, UserEntity> {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly tenantEnforcer: TenantIsolationEnforcer
    ) {}

    async handle(query: GetUserByIdQuery): Promise<UserEntity> {
        console.log('🔍 GET USER BY ID HANDLER: Processing query:', {
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
            // Non-superadmin users can only access users from their own tenant
            const requestingUserCustomerId = query.getTenantContext().getCustomerId()?.getValue();
            if (user.getCustomerId()?.getValue() !== requestingUserCustomerId) {
                throw new Error('Tenant access violation: Cannot access user from different customer');
            }
        }

        console.log('✅ GET USER BY ID HANDLER: User retrieved successfully:', {
            userId: user.getId().getValue(),
            email: user.getEmail().getValue(),
            role: user.getRole().getValue(),
            customerId: user.getCustomerId()?.getValue()
        });

        return user;
    }
}