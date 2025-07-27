import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';
import zxcvbn from 'zxcvbn';

export class Password extends ValueObject {
    constructor(private readonly value: string, private readonly isHashed: boolean = false) {
        super();
        if (!isHashed) {
            this.validate(value);
        }
    }

    getValue(): string {
        return this.value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof Password && this.value === other.getValue();
    }

    toString(): string {
        return this.value;
    }

    isHashedPassword(): boolean {
        return this.isHashed;
    }

    private validate(value: string): void {
        if (!value || value.length < 12) {
            throw new Error('Password must be at least 12 characters long');
        }
        if (!/[A-Z]/.test(value)) {
            throw new Error('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(value)) {
            throw new Error('Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(value)) {
            throw new Error('Password must contain at least one number');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
            throw new Error('Password must contain at least one special character');
        }
        
        // Use zxcvbn for sophisticated password strength validation
        // Score: 0 (too guessable) to 4 (very unguessable)
        // We require minimum score of 3 (safely unguessable)
        const result = zxcvbn(value);
        
        if (result.score < 3) {
            const feedback = result.feedback.warning || 
                           result.feedback.suggestions.join('. ') || 
                           'Password is too weak';
            throw new Error(`Password strength insufficient: ${feedback}`);
        }
    }

    static create(value: string): Password {
        return new Password(value);
    }

    static createHashed(hashedValue: string): Password {
        return new Password(hashedValue, true);
    }
}
