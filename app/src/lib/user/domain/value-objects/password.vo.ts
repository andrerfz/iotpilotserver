import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';

export class Password extends ValueObject {
    private static readonly MIN_LENGTH = 8;
    private static readonly REQUIRES_UPPERCASE = true;
    private static readonly REQUIRES_LOWERCASE = true;
    private static readonly REQUIRES_NUMBER = true;
    private static readonly REQUIRES_SPECIAL = true;

    private readonly value: string;
    private readonly isHashed: boolean;

    private constructor(value: string, isHashed: boolean = false) {
        super();
        this.value = value;
        this.isHashed = isHashed;
    }

    getValue(): string {
        return this.value;
    }

    isAlreadyHashed(): boolean {
        return this.isHashed;
    }

    equals(other: ValueObject): boolean {
        return other instanceof Password && this.value === other.value;
    }

    static createHashed(hashedValue: string): Password {
        return new Password(hashedValue, true);
    }

    static create(plainValue: string): Password {
        Password.validate(plainValue);
        return new Password(plainValue, false);
    }

    private static validate(value: string): void {
        if (value.length < Password.MIN_LENGTH) {
            throw new Error(`Password must be at least ${Password.MIN_LENGTH} characters long`);
        }

        if (Password.REQUIRES_UPPERCASE && !/[A-Z]/.test(value)) {
            throw new Error('Password must contain at least one uppercase letter');
        }

        if (Password.REQUIRES_LOWERCASE && !/[a-z]/.test(value)) {
            throw new Error('Password must contain at least one lowercase letter');
        }

        if (Password.REQUIRES_NUMBER && !/\d/.test(value)) {
            throw new Error('Password must contain at least one number');
        }

        if (Password.REQUIRES_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
            throw new Error('Password must contain at least one special character');
        }
    }
}