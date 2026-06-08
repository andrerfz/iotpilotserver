import {UserId} from '../user-id.vo';

describe('UserId Value Object', () => {
    describe('create', () => {
        it('should create a UserId with auto-generated UUID when no value provided', () => {
            const userId = UserId.create();

            expect(userId).toBeInstanceOf(UserId);
            expect(userId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should create a UserId with provided UUID value', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const userId = UserId.create(uuid);

            expect(userId).toBeInstanceOf(UserId);
            expect(userId.getValue()).toBe(uuid);
        });

        it('should create a UserId with simple string ID', () => {
            const simpleId = 'user-123';
            const userId = UserId.create(simpleId);

            expect(userId).toBeInstanceOf(UserId);
            expect(userId.getValue()).toBe(simpleId);
        });
    });

    describe('fromString', () => {
        it('should create a UserId from valid UUID string', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const userId = UserId.fromString(uuid);

            expect(userId).toBeInstanceOf(UserId);
            expect(userId.getValue()).toBe(uuid);
        });

        it('should create a UserId from simple string', () => {
            const simpleId = 'user-123';
            const userId = UserId.fromString(simpleId);

            expect(userId).toBeInstanceOf(UserId);
            expect(userId.getValue()).toBe(simpleId);
        });

        it('should throw error for empty string', () => {
            expect(() => UserId.fromString('')).toThrow('User ID cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            expect(() => UserId.fromString('   ')).toThrow('User ID cannot be empty');
        });

        it('should throw error for invalid format', () => {
            expect(() => UserId.fromString('invalid@format')).toThrow('Invalid User ID format');
        });
    });

    describe('generate', () => {
        it('should generate a new UUID-based UserId', () => {
            const userId = UserId.generate();

            expect(userId).toBeInstanceOf(UserId);
            expect(userId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
    });

    describe('equals', () => {
        it('should return true for equal UserIds', () => {
            const userId1 = UserId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const userId2 = UserId.fromString('550e8400-e29b-41d4-a716-446655440000');

            expect(userId1.equals(userId2)).toBe(true);
        });

        it('should return false for different UserIds', () => {
            const userId1 = UserId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const userId2 = UserId.fromString('650e8400-e29b-41d4-a716-446655440000');

            expect(userId1.equals(userId2)).toBe(false);
        });

        it('should return false for non-UserId objects', () => {
            const userId = UserId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const notUserId = { value: '550e8400-e29b-41d4-a716-446655440000' };

            expect(userId.equals(notUserId as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the UserId value as string', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const userId = UserId.fromString(uuid);

            expect(userId.toString()).toBe(uuid);
        });
    });
});
