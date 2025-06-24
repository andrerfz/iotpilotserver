import {User} from '@/lib/user/domain/entities/user.entity';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {UserRole} from '@/lib/user/domain/value-objects/user-role.vo';

// Define the shape of the user data in the database
interface UserPersistence {
    id: string;
    email: string;
    username: string;
    password: string;
    role: string;
    status?: string; // UserStatus enum in Prisma
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null; // Optional in create operation
    active?: boolean; // Mapped to status in Prisma
}

// Define the shape of the user data for DTOs
interface UserDTO {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    lastLoginAt: string | null;
    active: boolean;
}

export class UserMapper {
    static toDomain(persistence: UserPersistence): User {
        return new User(
            new UserId(persistence.id),
            new Email(persistence.email),
            Password.createHashed(persistence.password),
            new UserRole(persistence.role as any),
            persistence.createdAt,
            persistence.updatedAt,
            persistence.lastLoginAt,
            persistence.active
        );
    }

    static toPersistence(domain: User): UserPersistence {
        const email = domain.getEmail().getValue();
        // Generate a username from the email (remove @ and domain part)
        const username = email.split('@')[0];

        const result: UserPersistence = {
            id: domain.getId().getValue(),
            email: email,
            username: username,
            password: domain.getPassword().getValue(),
            role: domain.getRole().getValue(),
            status: domain.isActive() ? 'ACTIVE' : 'INACTIVE', // Map active boolean to UserStatus enum
            createdAt: domain.getCreatedAt(),
            updatedAt: domain.getUpdatedAt()
        };

        // Only add lastLoginAt if it's not null
        if (domain.getLastLoginAt() !== null) {
            result.lastLoginAt = domain.getLastLoginAt();
        }

        return result;
    }

    static toDTO(domain: User): UserDTO {
        return {
            id: domain.getId().getValue(),
            email: domain.getEmail().getValue(),
            role: domain.getRole().getValue(),
            createdAt: domain.getCreatedAt().toISOString(),
            lastLoginAt: domain.getLastLoginAt()?.toISOString() || null,
            active: domain.isActive()
        };
    }
}
