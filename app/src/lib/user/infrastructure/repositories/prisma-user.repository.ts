import {UserFilterCriteria, UserListResult, UserRepository} from '../../domain/interfaces/user-repository.interface';
import {UserEntity} from '../../domain/entities/user.entity';
import {UserId} from '../../domain/value-objects/user-id.vo';
import {Email} from '../../domain/value-objects/email.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserMapper} from '../mappers/user.mapper';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class PrismaUserRepository implements UserRepository {
    constructor(
        private readonly userMapper: UserMapper,
        private readonly prisma: PrismaService
    ) {
    }

    async findById(id: UserId, tenantContext?: TenantContext): Promise<UserEntity | null> {
        const user = await this.prisma.getClient().user.findUnique({
            where: {id: id.getValue()}
        });

        return user ? this.userMapper.toDomain(user) : null;
    }

    async findByEmail(email: Email, tenantContext?: TenantContext): Promise<UserEntity | null> {
        // Use direct Prisma client for authentication to avoid tenant filtering
        // This is necessary to find SUPERADMIN users who have customerId: null
        const emailValue = email.getValue();
        
        const user = await this.prisma.getClient().user.findUnique({
            where: {email: email.getValue()}
        });

        return user ? this.userMapper.toDomain(user) : null;
    }

    async findByEmailInTenant(email: Email, customerId: CustomerId): Promise<UserEntity | null> {
        const user = await this.prisma.getClient().user.findFirst({
            where: {
                email: email.getValue(),
                customerId: customerId.getValue()
            }
        });

        return user ? this.userMapper.toDomain(user) : null;
    }

    async existsByEmail(email: Email): Promise<boolean> {
        const user = await this.prisma.getClient().user.findUnique({
            where: {email: email.getValue()}
        });

        return !!user;
    }

    async existsByEmailInTenant(email: Email, customerId: CustomerId): Promise<boolean> {
        const user = await this.prisma.getClient().user.findFirst({
            where: {
                email: email.getValue(),
                customerId: customerId.getValue()
            }
        });

        return !!user;
    }

    async findAllInTenant(customerId: CustomerId): Promise<UserEntity[]> {
        const users = await this.prisma.getClient().user.findMany({
            where: {
                customerId: customerId.getValue()
            }
        });

        return users.map((user: any) => this.userMapper.toDomain(user));
    }

    async findSuperAdmins(): Promise<UserEntity[]> {
        const users = await this.prisma.getClient().user.findMany({
            where: {
                role: 'SUPERADMIN',
                customerId: null
            }
        });

        return users.map((user: any) => this.userMapper.toDomain(user));
    }

    async countInTenant(customerId: CustomerId): Promise<number> {
        return this.prisma.getClient().user.count({
            where: {
                customerId: customerId.getValue()
            }
        });
    }

    async findActiveInTenant(customerId: CustomerId): Promise<UserEntity[]> {
        const users = await this.prisma.getClient().user.findMany({
            where: {
                customerId: customerId.getValue(),
                deletedAt: null
            }
        });

        return users.map((user: any) => this.userMapper.toDomain(user));
    }

    async save(user: UserEntity): Promise<void> {
        const data = this.userMapper.toPersistence(user);
        const customerId = user.getCustomerId()?.getValue() || null;
        const userId = user.getId().getValue();
        console.log(`DEBUG: Saving user ${userId}, role: ${user.role.getValue()}, customerId: ${customerId}`);

        // Check if user already exists to determine if this is a create or update operation
        const existingUser = await this.prisma.getClient().user.findUnique({
            where: { id: userId }
        });

        if (existingUser) {
            // User exists - perform update only
            // For updates, we exclude both customer relation and customerId to avoid foreign key issues
            // Customer relationship should not change after initial creation
            const updateData: any = {
                ...data
            };
            delete updateData.customer;
            delete updateData.customerId;

            try {
                await this.prisma.getClient().user.update({
                    where: { id: userId },
                    data: updateData
                });
            } catch (error: any) {
                throw new Error(`Failed to update user ${userId}: ${error.message}`);
            }
        } else {
            // User doesn't exist - perform create only
            const createData: any = {
                ...data,
                status: 'ACTIVE' // Set default status
            };

            // For non-SUPERADMIN users, ensure customerId is set for create operations
            if (customerId && !user.isSuperAdmin()) {
                createData.customerId = customerId;
            } else {
                // For SUPERADMIN users, remove customerId from create
                delete createData.customerId;
            }

            console.log(`DEBUG: Creating user with customerId: ${createData.customerId}`);

            try {
                await this.prisma.getClient().user.create({
                    data: createData
                });
            } catch (error: any) {
                if (error.code === 'P2003' && error.message.includes('customerId')) {
                    // Enhanced error message for customer foreign key issues
                    throw new Error(`Customer relation error for user ${userId}: Customer with ID ${customerId} not found or not accessible. This might be due to transaction isolation or timing issues. Original error: ${error.message}`);
                }
                // Re-throw other errors as-is
                throw error;
            }
        }
    }

    async delete(id: UserId): Promise<void> {
        await this.prisma.getClient().user.delete({
            where: {id: id.getValue()}
        });
    }

    async findAll(): Promise<UserEntity[]> {
        const users = await this.prisma.getClient().user.findMany();
        return users.map((user: any) => this.userMapper.toDomain(user));
    }

    async findManyWithFilters(criteria: UserFilterCriteria, tenantContext: TenantContext): Promise<UserListResult> {
        // Build where clause based on filters
        const where: any = {};

        // Tenant isolation - if not superadmin, filter by customer
        if (!tenantContext.isSuperAdmin() && criteria.customerId) {
            where.customerId = criteria.customerId;
        } else if (!tenantContext.isSuperAdmin()) {
            // If no customerId provided but not superadmin, return empty result
            return { users: [], total: 0 };
        }

        // Apply filters
        if (criteria.role) {
            where.role = criteria.role;
        }

        if (criteria.status) {
            where.isActive = criteria.status === 'ACTIVE';
        }

        // Apply search filter (search in email and firstName/lastName)
        if (criteria.search) {
            where.OR = [
                {
                    email: {
                        contains: criteria.search,
                        mode: 'insensitive'
                    }
                },
                {
                    firstName: {
                        contains: criteria.search,
                        mode: 'insensitive'
                    }
                },
                {
                    lastName: {
                        contains: criteria.search,
                        mode: 'insensitive'
                    }
                }
            ];
        }

        // Get total count
        const total = await this.prisma.getClient().user.count({ where });

        // Get paginated results
        const users = await this.prisma.getClient().user.findMany({
            where,
            skip: criteria.offset || 0,
            take: criteria.limit || 20,
            orderBy: {
                createdAt: 'desc'
            }
        });

        return {
            users: users.map((user: any) => this.userMapper.toDomain(user)),
            total
        };
    }
}
