import {Username} from '../username.vo';

describe('Username Value Object', () => {
    describe('create', () => {
        it('should create a username with valid input', () => {
            const validUsername = 'john_doe123';
            const username = Username.create(validUsername);

            expect(username).toBeInstanceOf(Username);
            expect(username.getValue()).toBe(validUsername);
        });

        it('should trim whitespace from username', () => {
            const usernameWithSpaces = '  john_doe  ';
            const username = Username.create(usernameWithSpaces);

            expect(username.getValue()).toBe('john_doe');
        });

        it('should throw error for empty username', () => {
            expect(() => Username.create('')).toThrow('Username cannot be empty');
        });

        it('should throw error for whitespace-only username', () => {
            expect(() => Username.create('   ')).toThrow('Username cannot be empty');
        });

        it('should throw error for username shorter than 3 characters', () => {
            expect(() => Username.create('ab')).toThrow('Username must be at least 3 characters long');
        });

        it('should throw error for username longer than 50 characters', () => {
            const longUsername = 'a'.repeat(51);
            expect(() => Username.create(longUsername)).toThrow('Username cannot exceed 50 characters');
        });

        it('should throw error for username with invalid characters', () => {
            expect(() => Username.create('john@doe')).toThrow('Username can only contain letters, numbers, hyphens, and underscores');
        });

        it('should throw error for username with spaces', () => {
            expect(() => Username.create('john doe')).toThrow('Username can only contain letters, numbers, hyphens, and underscores');
        });

        it('should throw error for username with special characters', () => {
            expect(() => Username.create('john.doe')).toThrow('Username can only contain letters, numbers, hyphens, and underscores');
        });
    });

    describe('equals', () => {
        it('should return true for equal usernames', () => {
            const username1 = Username.create('john_doe');
            const username2 = Username.create('john_doe');

            expect(username1.equals(username2)).toBe(true);
        });

        it('should return false for different usernames', () => {
            const username1 = Username.create('john_doe');
            const username2 = Username.create('jane_doe');

            expect(username1.equals(username2)).toBe(false);
        });

        it('should return false for non-Username objects', () => {
            const username = Username.create('john_doe');
            const notUsername = { value: 'john_doe' };

            expect(username.equals(notUsername as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the username value', () => {
            const username = Username.create('john_doe');

            expect(username.toString()).toBe('john_doe');
        });
    });
});
