import {ValueObject} from '../base.value-object';

class UserRoleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserRoleValidationError';
  }
}

export type UserRoleType = 
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'USER'
  | 'READONLY';

export interface UserRoleData {
  value: UserRoleType;
}

export class UserRole extends ValueObject<UserRoleData> {
  private constructor(value: UserRoleType) {
    super({ value });
  }

  static create(value: UserRoleType): UserRole {
    const validRoles: UserRoleType[] = [
      'SUPERADMIN',
      'ADMIN', 
      'USER',
      'READONLY'
    ];

    if (!validRoles.includes(value)) {
      throw new UserRoleValidationError(`Invalid user role: ${value}`);
    }

    return new UserRole(value);
  }

  static fromString(value: string): UserRole {
    return UserRole.create(value as UserRoleType);
  }

  get value(): UserRoleType {
    return this.props.value;
  }

  getValue(): UserRoleType {
    return this.value;
  }

  equals(other: UserRole): boolean {
    return this.value === other.value;
  }

  isSuperAdmin(): boolean {
    return this.value === 'SUPERADMIN';
  }

  isAdmin(): boolean {
    return this.value === 'ADMIN';
  }

  isUser(): boolean {
    return this.value === 'USER';
  }

  isReadOnly(): boolean {
    return this.value === 'READONLY';
  }

  /**
   * Check if this role has the required role or higher (role hierarchy)
   * Role hierarchy: READONLY < USER < ADMIN < SUPERADMIN
   * @param requiredRole The required role
   * @returns True if this role has the required role or higher
   */
  hasRole(requiredRole: UserRoleType): boolean {
    const roleHierarchy: Record<UserRoleType, number> = {
      'READONLY': 0,
      'USER': 1,
      'ADMIN': 2,
      'SUPERADMIN': 3
    };
    return roleHierarchy[this.value] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if this role can access resources requiring the specified role
   * Alias for hasRole for better readability
   */
  canAccess(requiredRole: UserRoleType): boolean {
    return this.hasRole(requiredRole);
  }

  // Convenience factory methods
  static superAdmin(): UserRole {
    return new UserRole('SUPERADMIN');
  }

  static admin(): UserRole {
    return new UserRole('ADMIN');
  }

  static user(): UserRole {
    return new UserRole('USER');
  }

  static readOnly(): UserRole {
    return new UserRole('READONLY');
  }

  toString(): string {
    return this.value;
  }

  toJSON(): UserRoleData {
    return { value: this.value };
  }
}
