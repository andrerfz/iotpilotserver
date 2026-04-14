import {Password} from '../password.vo';

describe('Password Value Object', () => {
    describe('create', () => {
        it('should create a password with valid input', () => {
            const validPassword = 'StrongPass123!@#';
            const password = Password.create(validPassword);

            expect(password).toBeInstanceOf(Password);
            expect(password.getValue()).toBe(validPassword);
            expect(password.isHashedPassword()).toBe(false);
        });

        it('should throw error for password shorter than 12 characters', () => {
            const shortPassword = 'Short1!';

            expect(() => Password.create(shortPassword)).toThrow(
                'Password must be at least 12 characters long'
            );
        });

        it('should throw error for password without uppercase letter', () => {
            const noUpperPassword = 'strongpass123!@#';

            expect(() => Password.create(noUpperPassword)).toThrow(
                'Password must contain at least one uppercase letter'
            );
        });

        it('should throw error for password without lowercase letter', () => {
            const noLowerPassword = 'STRONGPASS123!@#';

            expect(() => Password.create(noLowerPassword)).toThrow(
                'Password must contain at least one lowercase letter'
            );
        });

        it('should throw error for password without number', () => {
            const noNumberPassword = 'StrongPass!@#';

            expect(() => Password.create(noNumberPassword)).toThrow(
                'Password must contain at least one number'
            );
        });

        it('should throw error for password without special character', () => {
            const noSpecialPassword = 'StrongPass123';

            expect(() => Password.create(noSpecialPassword)).toThrow(
                'Password must contain at least one special character'
            );
        });

        it('should throw error for weak password according to zxcvbn', () => {
            const weakPassword = 'Password123!';

            expect(() => Password.create(weakPassword)).toThrow(
                'Password strength insufficient'
            );
        });
    });

    describe('createHashed', () => {
        it('should create a hashed password without validation', () => {
            const hashedValue = '$2a$10$hashedpassword';
            const password = Password.createHashed(hashedValue);

            expect(password).toBeInstanceOf(Password);
            expect(password.getValue()).toBe(hashedValue);
            expect(password.isHashedPassword()).toBe(true);
        });

        it('should allow weak hashed passwords', () => {
            const weakHashed = 'weak';
            const password = Password.createHashed(weakHashed);

            expect(password).toBeInstanceOf(Password);
            expect(password.getValue()).toBe(weakHashed);
            expect(password.isHashedPassword()).toBe(true);
        });
    });

    describe('equals', () => {
        it('should return true for equal passwords', () => {
            const password1 = Password.create('StrongPass123!@#');
            const password2 = Password.create('StrongPass123!@#');

            expect(password1.equals(password2)).toBe(true);
        });

        it('should return false for different passwords', () => {
            const password1 = Password.create('StrongPass123!@#');
            const password2 = Password.create('DifferentPass456!@#');

            expect(password1.equals(password2)).toBe(false);
        });

        it('should return false for non-Password objects', () => {
            const password = Password.create('StrongPass123!@#');
            const notPassword = { value: 'StrongPass123!@#' };

            expect(password.equals(notPassword as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the password value', () => {
            const password = Password.create('StrongPass123!@#');

            expect(password.toString()).toBe('StrongPass123!@#');
        });
    });
});
