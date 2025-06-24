import {Entity} from '@/lib/shared/domain/interfaces/entity.interface';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';
import {Password} from '../value-objects/password.vo';
import {UserRole} from '../value-objects/user-role.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserRegisteredEvent} from '../events/user-registered.event';
import {UserAuthenticatedEvent} from '../events/user-authenticated.event';

export class User extends Entity<UserId> {
    constructor(
        id: UserId,
        private email: Email,
        private username: string,
        private password: Password,
        private role: UserRole,
        private customerId: CustomerId | null, // null for SUPERADMIN
        private readonly createdAt: Date,
        private updatedAt: Date,
        private lastLoginAt: Date | null = null,
        private active: boolean = true
    ) {
        super(id);
        this.validateTenantConsistency();
    }

    private validateTenantConsistency(): void {
        // SUPERADMIN must have null customerId
        if (this.role.isSuperAdmin() && this.customerId !== null) {
            throw new Error('SUPERADMIN users cannot be associated with a customer');
        }

        // Non-SUPERADMIN must have customerId
        if (!this.role.isSuperAdmin() && this.customerId === null) {
            throw new Error('Non-SUPERADMIN users must be associated with a customer');
        }
    }

    getId(): UserId {
        return this.id;
    }

    getEmail(): Email {
        return this.email;
    }

    getUsername(): string {
        return this.username;
    }

    getPassword(): Password {
        return this.password;
    }

    getRole(): UserRole {
        return this.role;
    }

    getCustomerId(): CustomerId | null {
        return this.customerId;
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

    isSuperAdmin(): boolean {
        return this.role.isSuperAdmin();
    }

    belongsToTenant(tenantId: CustomerId): boolean {
        if (this.isSuperAdmin()) return true; // SUPERADMIN has access to all tenants
        return this.customerId?.equals(tenantId) || false;
    }

    changePassword(newPassword: Password): void {
        this.password = newPassword;
        this.updatedAt = new Date();
    }

    updateLastLogin(): void {
        this.lastLoginAt = new Date();
        this.addEvent(new UserAuthenticatedEvent(this.id, this.email));
    }

    recordLogin(): void {
        this.updateLastLogin();
    }

    updateEmail(email: Email): void {
        this.email = email;
        this.updatedAt = new Date();
    }

    updateRole(role: UserRole): void {
        this.role = role;
        this.updatedAt = new Date();
        this.validateTenantConsistency();
    }

    updatePassword(password: Password): void {
        this.changePassword(password);
    }

    deactivate(): void {
        this.active = false;
        this.updatedAt = new Date();
    }

    activate(): void {
        this.active = true;
        this.updatedAt = new Date();
    }

    static create(
        email: Email,
        password: Password,
        role: UserRole,
        customerId: CustomerId | null,
        username?: string
    ): User {
        // Generate a username from email if not provided
        const generatedUsername = username || email.getValue().split('@')[0];

        const user = new User(
            UserId.create(),
            email,
            generatedUsername,
            password,
            role,
            customerId,
            new Date(),
            new Date()
        );

        user.addEvent(new UserRegisteredEvent(user.id, user.email, user.role, user.customerId));
        return user;
    }

    equals(other: Entity<UserId>): boolean {
        return other instanceof User && this.id.equals(other.id);
    }
}
