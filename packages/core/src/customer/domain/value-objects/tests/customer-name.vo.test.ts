import {CustomerName} from '../customer-name.vo';

describe('CustomerName Value Object', () => {
    describe('create', () => {
        it('should create a CustomerName with valid input', () => {
            const validName = 'Acme Corporation';
            const customerName = CustomerName.create(validName);

            expect(customerName).toBeInstanceOf(CustomerName);
            expect(customerName.getValue()).toBe(validName);
        });

        it('should create a CustomerName with minimum valid length', () => {
            const minName = 'A';
            const customerName = CustomerName.create(minName);

            expect(customerName).toBeInstanceOf(CustomerName);
            expect(customerName.getValue()).toBe(minName);
        });

        it('should create a CustomerName with maximum valid length', () => {
            const maxName = 'A'.repeat(100);
            const customerName = CustomerName.create(maxName);

            expect(customerName).toBeInstanceOf(CustomerName);
            expect(customerName.getValue()).toBe(maxName);
            expect(customerName.getValue().length).toBe(100);
        });

        it('should throw error for empty string', () => {
            expect(() => CustomerName.create('')).toThrow('CustomerName cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            expect(() => CustomerName.create('   ')).toThrow('CustomerName cannot be empty');
        });

        it('should throw error for name longer than 100 characters', () => {
            const longName = 'A'.repeat(101);
            expect(() => CustomerName.create(longName)).toThrow('CustomerName cannot be longer than 100 characters');
        });
    });

    describe('equals', () => {
        it('should return true for equal CustomerNames', () => {
            const name1 = CustomerName.create('Acme Corp');
            const name2 = CustomerName.create('Acme Corp');

            expect(name1.equals(name2)).toBe(true);
        });

        it('should return false for different CustomerNames', () => {
            const name1 = CustomerName.create('Acme Corp');
            const name2 = CustomerName.create('Tech Corp');

            expect(name1.equals(name2)).toBe(false);
        });

        it('should return false for non-CustomerName objects', () => {
            const name = CustomerName.create('Acme Corp');
            const notName = { value: 'Acme Corp' };

            expect(name.equals(notName as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the CustomerName value as string', () => {
            const name = CustomerName.create('Acme Corp');

            expect(name.toString()).toBe('Acme Corp');
        });
    });
});
