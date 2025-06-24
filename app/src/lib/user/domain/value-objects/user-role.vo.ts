import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';

export enum UserRoleEnum {
    ADMIN = 'ADMIN',
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

    isAdmin(): boolean {
        return this.value === UserRoleEnum.ADMIN;
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

    static admin(): UserRole {
        return new UserRole(UserRoleEnum.ADMIN);
    }

    static user(): UserRole {
        return new UserRole(UserRoleEnum.USER);
    }

    static guest(): UserRole {
        return new UserRole(UserRoleEnum.GUEST);
    }
}