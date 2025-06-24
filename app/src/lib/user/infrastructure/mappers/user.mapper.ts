import {User} from '@/lib/user/domain/entities/user.entity';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {UserRole} from '@/lib/user/domain/value-objects/user-role.vo';
import {UserRoleEnum} from '@/lib/user/domain/value-objects/user-role.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {User as PrismaUser, UserRole as PrismaUserRole, UserStatus} from '@prisma/client';

export class UserMapper {
    // Helper method to map domain role to Prisma role
    private mapToPrismaRole(domainRole: UserRoleEnum): PrismaUserRole {
        switch (domainRole) {
            case UserRoleEnum.SUPERADMIN:
                return PrismaUserRole.SUPERADMIN;
            case UserRoleEnum.CUSTOMER_ADMIN:
                return PrismaUserRole.ADMIN;
            case UserRoleEnum.USER:
                return PrismaUserRole.USER;
            case UserRoleEnum.GUEST:
                return PrismaUserRole.READONLY;
            default:
                throw new Error(`Unsupported user role: ${domainRole}`);
        }
    }

    toDomain(prismaUser: PrismaUser): User {
        return new User(
            UserId.fromString(prismaUser.id),
            Email.create(prismaUser.email),
            prismaUser.username,
            Password.create(prismaUser.password),
            UserRole.create(prismaUser.role),
            prismaUser.customerId ? CustomerId.create(prismaUser.customerId) : null,
            prismaUser.createdAt,
            prismaUser.updatedAt,
            prismaUser.lastLoginAt,
            prismaUser.active
        );
    }

    toPersistence(user: User): Omit<PrismaUser, 'id'> & { id: string } & { customer?: { connect: { id: string } } } {
        const customerId = user.getCustomerId()?.getValue() || null;
        const domainRole = user.getRole().getValue();
        const prismaRole = this.mapToPrismaRole(domainRole);

        return {
            id: user.getId().getValue(),
            email: user.getEmail().getValue(),
            username: user.getUsername(),
            password: user.getPassword().getValue(),
            role: prismaRole,
            status: UserStatus.ACTIVE, // Default status
            active: user.isActive(),
            profileImage: null, // Default value
            lastLoginAt: user.getLastLoginAt(),
            deletedAt: null, // Default value
            customerId: customerId,
            customer: customerId ? { connect: { id: customerId } } : undefined,
            createdAt: user.getCreatedAt(),
            updatedAt: user.getUpdatedAt()
        };
    }

    toDTO(user: User): {
        id: string;
        email: string;
        username: string;
        role: string;
        customerId: string | null;
        createdAt: string;
        lastLoginAt: string | null;
        active: boolean;
    } {
        return {
            id: user.getId().getValue(),
            email: user.getEmail().getValue(),
            username: user.getUsername(),
            role: user.getRole().getValue(),
            customerId: user.getCustomerId()?.getValue() || null,
            createdAt: user.getCreatedAt().toISOString(),
            lastLoginAt: user.getLastLoginAt()?.toISOString() || null,
            active: user.isActive()
        };
    }
}
