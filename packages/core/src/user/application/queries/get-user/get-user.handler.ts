import {GetUserQuery} from './get-user.query';
import {UserRepository} from '../../../domain/interfaces/user-repository.interface';
import {UserId} from '../../../domain/value-objects/user-id.vo';
import {QueryHandler} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {UserNotFoundException} from '../../../domain/exceptions/user.exception';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';

export interface UserDto {
  id: string;
  email: string;
  role: string;
  customerId?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  fullName: string;
  displayName: string;
  isActive: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export class GetUserHandler implements QueryHandler<GetUserQuery, UserDto> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: StructuredLogger
  ) {}

  async handle(query: GetUserQuery): Promise<UserDto> {
    const userId = query.userId;
    const tenantContext = query.getTenantContext();

    if (!tenantContext) {
      throw new Error('Tenant context is required for user query');
    }

    // Find user
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

    // Check if user can access this user
    const currentUserId = tenantContext.getUserId();
    if (currentUserId && currentUserId.getValue() !== id.getValue() && !tenantContext.isSuperAdmin()) {
      // Users can only access their own data unless SUPERADMIN
      throw new Error('Access denied: Cannot access other user data');
    }

    const userDto: UserDto = {
      id: user.getId().getValue(),
      email: user.getEmail().getValue(),
      role: user.getRole().getValue(),
      customerId: user.getCustomerId()?.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      fullName: user.getFullName(),
      displayName: user.getDisplayName(),
      isActive: user.isActive,
      isLocked: user.isLocked(),
      failedLoginAttempts: user.credentials.failedLoginAttempts,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isDeleted: user.isDeleted()
    };

    this.logger.debug('User retrieved successfully', {
      userId: user.getId().getValue(),
      email: user.getEmail().getValue(),
      role: user.getRole().getValue(),
      accessedBy: tenantContext.getUserId()?.getValue() || 'system'
    });

    return userDto;
  }
}
