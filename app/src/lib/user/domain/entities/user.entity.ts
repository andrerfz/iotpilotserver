import {Entity} from '@/lib/shared/domain/interfaces/entity.interface';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';
import {Password} from '../value-objects/password.vo';
import {UserRole} from '../value-objects/user-role.vo';

export class User extends Entity<UserId> {
    constructor(
        id: UserId,
        private email: Email,
        private password: Password,
        private role: UserRole,
        private readonly createdAt: Date,
        private updatedAt: Date,
        private lastLoginAt: Date | null = null,
        private active: boolean = true
    ) {
        super(id);
    }

    getId(): UserId {
        return this.id;
    }

    getEmail(): Email {
        return this.email;
    }

    getPassword(): Password {
        return this.password;
    }

    getRole(): UserRole {
        return this.role;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    getUpdatedAt(): Date {
        return this.updatedAt;
    }

    getLastLoginAt(): Date | null {
        return this.lastLoginAt;
    }

    isActive(): boolean {
        return this.active;
    }

    updateEmail(email: Email): void {
        this.email = email;
        this.updatedAt = new Date();
    }

    updatePassword(password: Password): void {
        this.password = password;
        this.updatedAt = new Date();
    }

    updateRole(role: UserRole): void {
        this.role = role;
        this.updatedAt = new Date();
    }

    recordLogin(): void {
        this.lastLoginAt = new Date();
        this.updatedAt = new Date();
    }

    activate(): void {
        this.active = true;
        this.updatedAt = new Date();
    }

    deactivate(): void {
        this.active = false;
        this.updatedAt = new Date();
    }

    static create(
        id: UserId,
        email: Email,
        password: Password,
        role: UserRole
    ): User {
        const now = new Date();
        return new User(id, email, password, role, now, now);
    }
}