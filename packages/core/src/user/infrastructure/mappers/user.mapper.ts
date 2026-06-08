import {UserEntity} from '../../domain/entities/user.entity';
import {UserId} from '../../domain/value-objects/user-id.vo';
import {Email} from '../../domain/value-objects/email.vo';
import {UserRole} from '../../../shared/domain/value-objects/user-role.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class UserMapper {

    toDomain(prismaUser: any): UserEntity {
        const id = UserId.fromString(prismaUser.id);
        const email = Email.fromString(prismaUser.email);
        const role = UserRole.fromString(prismaUser.role);
        const customerId = prismaUser.customerId ? CustomerId.fromString(prismaUser.customerId) : undefined;

        const credentials = {
            passwordHash: prismaUser.password || '',  // DB column is 'password', not 'passwordHash'
            salt: prismaUser.salt || '',
            failedLoginAttempts: prismaUser.failedLoginAttempts || 0,
            isLocked: prismaUser.isLocked || false,
            lockedUntil: prismaUser.lockedUntil
        };

        const user = new UserEntity(id, email, role, customerId, credentials, prismaUser.username);
        user.publicId = prismaUser.publicId;
        user.firstName = prismaUser.firstName;
        user.lastName = prismaUser.lastName;
        user.phoneNumber = prismaUser.phoneNumber;
        // Prisma schema uses `status` enum (ACTIVE/PENDING/SUSPENDED/INACTIVE), not `isActive` boolean
        user.isActive = prismaUser.status === 'ACTIVE';
        user.lastLogin = prismaUser.lastLoginAt;
        user.createdAt = prismaUser.createdAt || new Date();
        user.updatedAt = prismaUser.updatedAt || new Date();
        user.deletedAt = prismaUser.deletedAt;

        return user;
    }

    toPersistence(user: UserEntity): any {
        return {
            id: user.getId().getValue(),
            email: user.email.getValue(),
            username: user.username,
            role: user.role.getValue(),
            customerId: user.getCustomerId()?.getValue(),
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            status: user.isActive ? 'ACTIVE' : 'INACTIVE',
            password: user.credentials.passwordHash,  // DB column is 'password'
            salt: user.credentials.salt,
            failedLoginAttempts: user.credentials.failedLoginAttempts,
            lastFailedLogin: user.credentials.lastFailedLogin,
            isLocked: user.credentials.isLocked,
            lockedUntil: user.credentials.lockedUntil,
            lastLoginAt: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            deletedAt: user.deletedAt
        };
    }

    toDTO(user: UserEntity): {
        id: string;
        email: string;
        role: string;
        customerId: string | null;
        createdAt: string;
        lastLoginAt: string | null;
        active: boolean;
        status: string;
    } {
        return {
            id: user.publicId,
            email: user.email.getValue(),
            role: user.role.getValue(),
            customerId: user.getCustomerId()?.getValue() || null,
            createdAt: user.createdAt.toISOString(),
            lastLoginAt: user.lastLogin ? user.lastLogin.toISOString() : null,
            active: user.isActive,
            status: user.isActive ? 'ACTIVE' : 'INACTIVE'
        };
    }
}
