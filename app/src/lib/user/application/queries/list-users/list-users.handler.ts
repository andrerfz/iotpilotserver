import {ListUsersQuery} from './list-users.query';
import {UserRepository} from '../../../domain/interfaces/user-repository.interface';
import {UserEntity} from '../../../domain/entities/user.entity';
import {QueryHandler} from '@/lib/shared/application/interfaces/query.interface';
import {StructuredLogger} from '@/lib/shared/infrastructure/logging/structured-logger';

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

export interface UserListResult {
  users: UserDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export class ListUsersHandler implements QueryHandler<ListUsersQuery, UserListResult> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: StructuredLogger
  ) {}

  async handle(query: ListUsersQuery): Promise<UserListResult> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const role = query.role;
    const isActive = query.isActive;
    const searchTerm = query.searchTerm;
    const tenantContext = query.getTenantContext();

    if (!tenantContext) {
      throw new Error('Tenant context is required for listing users');
    }

    const skip = (page - 1) * limit;

    // Apply tenant filtering
    const customerId = tenantContext.getCustomerId();
    const filterCriteria = {
      customerId: customerId && !tenantContext.isSuperAdmin() ? customerId.getValue() : undefined,
      role: role?.toUpperCase(),
      status: isActive !== undefined ? (isActive ? 'ACTIVE' : 'INACTIVE') : undefined,
      search: searchTerm,
      limit,
      offset: skip
    };

    // Get paginated users with filters
    const result = await this.userRepository.findManyWithFilters(filterCriteria, tenantContext);

    // Transform to DTOs
    const userDtos: UserDto[] = result.users.map((user: UserEntity) => ({
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
    }));

    const listResult: UserListResult = {
      users: userDtos,
      total: result.total,
      page,
      limit,
      hasMore: skip + limit < result.total,
      totalPages: Math.ceil(result.total / limit)
    };

    this.logger.debug('Users listed successfully', {
      page,
      limit,
      total: result.total,
      filtered: role || isActive !== undefined || searchTerm ? 'yes' : 'no',
      accessedBy: tenantContext.getUserId()?.getValue() || 'system',
      customerId: customerId?.getValue()
    });

    return listResult;
  }
}