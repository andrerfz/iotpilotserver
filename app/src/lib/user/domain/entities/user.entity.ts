import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';
import {UserRole} from '../../../shared/domain/value-objects/user-role.vo';
import {CustomerId} from '../../../shared/domain/value-objects/customer-id.vo';
import {TenantScopedEntity} from '../../../shared/domain/tenant-scoped.entity';

export interface UserCredentials {
  passwordHash: string;
  salt: string;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
  isLocked: boolean;
  lockedUntil?: Date;
}

export class UserEntity extends TenantScopedEntity<UserId> {
  private _email: Email;
  private _role: UserRole;
  private _username: string;
  public firstName?: string;
  public lastName?: string;
  public phoneNumber?: string;
  private _isActive: boolean = true;
  public credentials: UserCredentials;
  public lastLogin?: Date;
  public createdAt: Date;
  public updatedAt: Date;
  public deletedAt?: Date;

  get email(): Email {
    return this._email;
  }

  set email(value: Email) {
    this._email = value;
  }

  get username(): string {
    return this._username;
  }

  set username(value: string) {
    this._username = value;
  }

  get role(): UserRole {
    return this._role;
  }

  set role(value: UserRole) {
    this._role = value;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  set isActive(value: boolean) {
    this._isActive = value;
  }

    constructor(
        id: UserId,
    email: Email,
    role: UserRole,
    customerId?: CustomerId,
    credentials: UserCredentials = {
      passwordHash: '',
      salt: '',
      failedLoginAttempts: 0,
      isLocked: false
    },
    username?: string
  ) {
    super(id, customerId);
    this._email = email;
    this._role = role;
    this._username = username || email.getValue(); // Default to email if no username
    this.credentials = credentials;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static create(
    id: UserId,
    email: Email,
    role: UserRole,
    customerId?: CustomerId,
    credentials?: UserCredentials,
    username?: string
  ): UserEntity {
    return new UserEntity(id, email, role, customerId, credentials, username);
  }

  static createFromRegistration(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    customerId: CustomerId,
    role: UserRole = UserRole.fromString('USER')
  ): UserEntity {
    const id = UserId.fromString(`user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const userEmail = Email.fromString(email);
    
    // Hash password (implementation would use bcrypt)
    const passwordHash = `hashed_${password}`; // Placeholder
    const salt = `salt_${Date.now()}`; // Placeholder
    
    const credentials: UserCredentials = {
      passwordHash,
      salt,
      failedLoginAttempts: 0,
      isLocked: false
    };

    const user = new UserEntity(id, userEmail, role, customerId, credentials);
    user.firstName = firstName;
    user.lastName = lastName;
    
    return user;
  }

  // Update methods for read-only properties
  updateProfile(firstName?: string, lastName?: string, phoneNumber?: string): void {
    if (firstName !== undefined) this.firstName = firstName;
    if (lastName !== undefined) this.lastName = lastName;
    if (phoneNumber !== undefined) this.phoneNumber = phoneNumber;
    this.updatedAt = new Date();
  }

  updateEmail(newEmail: Email): void {
    this.email = newEmail;
    this.updatedAt = new Date();
  }

  updateRole(newRole: UserRole): void {
    // Only allow role changes for non-SUPERADMIN roles or by SUPERADMIN
    if (this.role.isSuperAdmin() && !newRole.isSuperAdmin()) {
      throw new Error('Cannot downgrade SUPERADMIN role');
    }

    this.role = newRole;
    this.updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this.updatedAt = new Date();
  }

  lockAccount(until?: Date): void {
    this.credentials.isLocked = true;
    this.credentials.lockedUntil = until;
    this.updatedAt = new Date();
  }

  unlockAccount(): void {
    this.credentials.isLocked = false;
    this.credentials.lockedUntil = undefined;
    this.credentials.failedLoginAttempts = 0;
    this.updatedAt = new Date();
  }

  recordFailedLogin(): void {
    this.credentials.failedLoginAttempts += 1;
    
    // Lock account after 5 failed attempts
    if (this.credentials.failedLoginAttempts >= 5) {
      this.lockAccount(new Date(Date.now() + 30 * 60 * 1000)); // 30 minutes
      throw new Error('Account locked due to too many failed login attempts');
    }
    
    this.updatedAt = new Date();
  }

  recordSuccessfulLogin(): void {
    this.lastLogin = new Date();
    this.credentials.failedLoginAttempts = 0;
    this.updatedAt = new Date();
  }

  updatePassword(newPasswordHash: string, newSalt: string): void {
    this.credentials.passwordHash = newPasswordHash;
    this.credentials.salt = newSalt;
    this.credentials.failedLoginAttempts = 0;
    this.updatedAt = new Date();
  }

  // Status and role methods
  checkIsActive(): boolean {
    return this._isActive && !this.isLocked();
  }

  isLocked(): boolean {
    if (!this.credentials.isLocked) return false;
    
    if (this.credentials.lockedUntil && this.credentials.lockedUntil > new Date()) {
      return true;
    }
    
    // Auto-unlock expired locks
    this.unlockAccount();
    return false;
    }

    isSuperAdmin(): boolean {
        return this.role.isSuperAdmin();
    }
    
  canAccessCustomer(customerId: CustomerId): boolean {
    // SUPERADMIN can access any customer
    if (this.isSuperAdmin()) return true;

    // Regular users can only access their own customer
    return this.customerId ? this.customerId.equals(customerId) : false;
  }

  // Tenant validation methods
  belongsToTenant(customerId: CustomerId): boolean {
    return !this.customerId || this.customerId.equals(customerId);
  }

  validateBelongsToTenant(customerId: CustomerId): void {
    if (!this.belongsToTenant(customerId) && !this.isSuperAdmin()) {
      throw new Error(
        `User ${this.id.getValue()} does not belong to customer ${customerId.getValue()}`
      );
    }
  }

  // Lifecycle methods
  softDelete(): void {
    if (this.deletedAt) {
      throw new Error(`User ${this.id.getValue()} is already soft deleted`);
    }
    
    // Lock account before deletion
    this.lockAccount();
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  restore(): void {
    if (!this.deletedAt) {
      throw new Error(`User ${this.id.getValue()} is not soft deleted`);
    }
    
    this.deletedAt = undefined;
    this.unlockAccount();
    this.updatedAt = new Date();
  }

  isDeleted(): boolean {
    return !!this.deletedAt;
  }

  // Required abstract method implementations
  getAggregateId(): string {
    return this.id.getValue();
  }

  getId(): UserId {
    return this.id;
  }

  getEmail(): Email {
    return this._email;
  }

  getUsername(): string {
    return this._username;
  }

  getRole(): UserRole {
    return this._role;
  }

  getCustomerId(): CustomerId | undefined {
    return this.customerId;
  }

  getTenantId(): CustomerId {
    if (!this.customerId) {
      throw new Error('SUPERADMIN users do not belong to a specific tenant');
    }
    return this.customerId;
  }

  // Utility methods
  getFullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.email.getValue();
  }

  getDisplayName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    if (this.firstName) {
      return this.firstName;
    }
    return this.email.getValue();
  }

  // Persistence mapping
  toPersistence(): any {
    return {
      id: this.id.getValue(),
      email: this.email.getValue(),
      username: this._username,
      role: this.role.getValue(),
      customerId: this.customerId?.getValue(),
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phoneNumber,
      isActive: this.isActive,
      passwordHash: this.credentials.passwordHash,
      salt: this.credentials.salt,
      failedLoginAttempts: this.credentials.failedLoginAttempts,
      lastFailedLogin: this.credentials.lastFailedLogin,
      isLocked: this.credentials.isLocked,
      lockedUntil: this.credentials.lockedUntil,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt
    };
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}

// Export for compatibility
export type User = UserEntity;
