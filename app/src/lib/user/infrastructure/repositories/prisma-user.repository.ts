import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {User} from '@/lib/user/domain/entities/user.entity';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserMapper} from '../mappers/user.mapper';
import {tenantPrisma} from '@/lib/tenant-middleware';

export class PrismaUserRepository implements UserRepository {
    constructor(
        private readonly userMapper: UserMapper
    ) {}

    async findById(id: UserId): Promise<User | null> {
        const user = await tenantPrisma.client.user.findUnique({
            where: { id: id.getValue() }
        });

        return user ? this.userMapper.toDomain(user) : null;
    }

    async findByEmail(email: Email): Promise<User | null> {
        const user = await tenantPrisma.client.user.findUnique({
            where: { email: email.getValue() }
        });

        return user ? this.userMapper.toDomain(user) : null;
    }

    async findByEmailInTenant(email: Email, customerId: CustomerId): Promise<User | null> {
        const user = await tenantPrisma.client.user.findFirst({
            where: { 
                email: email.getValue(),
                customer: {
                    id: customerId.getValue()
                }
            }
        });

        return user ? this.userMapper.toDomain(user) : null;
    }

    async existsByEmail(email: Email): Promise<boolean> {
        const user = await tenantPrisma.client.user.findUnique({
            where: { email: email.getValue() }
        });

        return !!user;
    }

    async existsByEmailInTenant(email: Email, customerId: CustomerId): Promise<boolean> {
        const user = await tenantPrisma.client.user.findFirst({
            where: { 
                email: email.getValue(),
                customer: {
                    id: customerId.getValue()
                }
            }
        });

        return !!user;
    }

    async findAllInTenant(customerId: CustomerId): Promise<User[]> {
        const users = await tenantPrisma.client.user.findMany({
            where: { 
                customer: {
                    id: customerId.getValue()
                }
            }
        });

        return users.map(user => this.userMapper.toDomain(user));
    }

    async findSuperAdmins(): Promise<User[]> {
        const users = await tenantPrisma.client.user.findMany({
            where: { 
                role: 'SUPERADMIN',
                customer: null
            }
        });

        return users.map(user => this.userMapper.toDomain(user));
    }

    async countInTenant(customerId: CustomerId): Promise<number> {
        return tenantPrisma.client.user.count({
            where: {
                customer: {
                    id: customerId.getValue()
                }
            }
        });
    }

    async findActiveInTenant(customerId: CustomerId): Promise<User[]> {
        const users = await tenantPrisma.client.user.findMany({
            where: { 
                customer: {
                    id: customerId.getValue()
                },
                active: true
            }
        });

        return users.map(user => this.userMapper.toDomain(user));
    }

    async save(user: User): Promise<void> {
        const data = this.userMapper.toPersistence(user);
        const { customer, ...dataWithoutCustomer } = data;

        // Explicitly exclude lastLoginAt, active, and customer from create operation
        await tenantPrisma.client.user.upsert({
            where: { id: user.getId().getValue() },
            create: {
                ...dataWithoutCustomer,
                lastLoginAt: undefined,
                active: undefined,
                status: 'ACTIVE' // Set default status
            },
            update: {
                ...dataWithoutCustomer,
                lastLoginAt: undefined,
                active: undefined
            }
        });
    }

    async delete(id: UserId): Promise<void> {
        await tenantPrisma.client.user.delete({
            where: { id: id.getValue() }
        });
    }

    async findAll(): Promise<User[]> {
        const users = await tenantPrisma.client.user.findMany();
        return users.map(user => this.userMapper.toDomain(user));
    }
}
