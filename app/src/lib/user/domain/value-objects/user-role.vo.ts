import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';

export enum UserRoleEnum {
    SUPERADMIN = 'SUPERADMIN',
    CUSTOMER_ADMIN = 'CUSTOMER_ADMIN',
    USER = 'USER',
    GUEST = 'GUEST'
}

export class UserRole extends ValueObject {
    constructor(private readonly value: UserRoleEnum) {
        super();
    }

    getValue(): UserRoleEnum {
        return this.value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof UserRole && this.value === other.value;
    }

    isSuperAdmin(): boolean {
        return this.value === UserRoleEnum.SUPERADMIN;
    }

    isCustomerAdmin(): boolean {
        return this.value === UserRoleEnum.CUSTOMER_ADMIN;
    }

    isUser(): boolean {
        return this.value === UserRoleEnum.USER;
    }

    isGuest(): boolean {
        return this.value === UserRoleEnum.GUEST;
    }

    toString(): string {
        return this.value;
    }

    static create(value: string): UserRole {
        if (!Object.values(UserRoleEnum).includes(value as UserRoleEnum)) {
            throw new Error(`Invalid user role: ${value}`);
        }
        return new UserRole(value as UserRoleEnum);
    }

    static superAdmin(): UserRole {
        return new UserRole(UserRoleEnum.SUPERADMIN);
    }

    static customerAdmin(): UserRole {
        return new UserRole(UserRoleEnum.CUSTOMER_ADMIN);
    }

    static user(): UserRole {
        return new UserRole(UserRoleEnum.USER);
    }

    static guest(): UserRole {
        return new UserRole(UserRoleEnum.GUEST);
    }
}
