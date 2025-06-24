import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';
import { v4 as uuidv4 } from 'uuid';

export class CustomerId extends ValueObject {
    constructor(private readonly value: string) {
        super();
        this.validate(value);
    }

    getValue(): string {
        return this.value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof CustomerId && this.value === (other as CustomerId).getValue();
    }

    toString(): string {
        return this.value;
    }

    private validate(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('Customer ID cannot be empty');
        }
    }

    static create(value?: string): CustomerId {
        return new CustomerId(value || uuidv4());
    }
}