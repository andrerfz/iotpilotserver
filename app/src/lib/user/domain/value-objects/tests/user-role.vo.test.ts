import {UserRole} from '../user-role.vo';

describe('UserRole Value Object', () => {
    describe('create', () => {
        it('should create a UserRole with valid SUPERADMIN role', () => {
            const role = UserRole.create('SUPERADMIN');

            expect(role).toBeInstanceOf(UserRole);
            expect(role.getValue()).toBe('SUPERADMIN');
        });

        it('should create a UserRole with valid ADMIN role', () => {
            const role = UserRole.create('ADMIN');

            expect(role).toBeInstanceOf(UserRole);
            expect(role.getValue()).toBe('ADMIN');
        });

        it('should create a UserRole with valid USER role', () => {
            const role = UserRole.create('USER');

            expect(role).toBeInstanceOf(UserRole);
            expect(role.getValue()).toBe('USER');
        });

        it('should create a UserRole with valid GUEST role', () => {
            const role = UserRole.create('GUEST');

            expect(role).toBeInstanceOf(UserRole);
            expect(role.getValue()).toBe('READONLY');
        });

        it('should throw error for invalid role', () => {
            expect(() => UserRole.create('INVALID_ROLE')).toThrow('Invalid user role: INVALID_ROLE');
        });

        it('should throw error for empty string', () => {
            expect(() => UserRole.create('')).toThrow('Invalid user role: ');
        });
    });

    describe('static factory methods', () => {
        it('should create SUPERADMIN role using superAdmin()', () => {
            const role = UserRole.superAdmin();

            expect(role.getValue()).toBe('SUPERADMIN');
            expect(role.isSuperAdmin()).toBe(true);
        });

        it('should create ADMIN role using customerAdmin()', () => {
            const role = UserRole.customerAdmin();

            expect(role.getValue()).toBe('ADMIN');
            expect(role.isCustomerAdmin()).toBe(true);
        });

        it('should create USER role using user()', () => {
            const role = UserRole.user();

            expect(role.getValue()).toBe('USER');
            expect(role.isUser()).toBe(true);
        });

        it('should create GUEST role using guest()', () => {
            const role = UserRole.guest();

            expect(role.getValue()).toBe('READONLY');
            expect(role.isGuest()).toBe(true);
        });
    });

    describe('role checking methods', () => {
        it('should correctly identify SUPERADMIN role', () => {
            const role = UserRole.superAdmin();

            expect(role.isSuperAdmin()).toBe(true);
            expect(role.isCustomerAdmin()).toBe(false);
            expect(role.isUser()).toBe(false);
            expect(role.isGuest()).toBe(false);
        });

        it('should correctly identify ADMIN role', () => {
            const role = UserRole.customerAdmin();

            expect(role.isSuperAdmin()).toBe(false);
            expect(role.isCustomerAdmin()).toBe(true);
            expect(role.isUser()).toBe(false);
            expect(role.isGuest()).toBe(false);
        });

        it('should correctly identify USER role', () => {
            const role = UserRole.user();

            expect(role.isSuperAdmin()).toBe(false);
            expect(role.isCustomerAdmin()).toBe(false);
            expect(role.isUser()).toBe(true);
            expect(role.isGuest()).toBe(false);
        });

        it('should correctly identify GUEST role', () => {
            const role = UserRole.guest();

            expect(role.isSuperAdmin()).toBe(false);
            expect(role.isCustomerAdmin()).toBe(false);
            expect(role.isUser()).toBe(false);
            expect(role.isGuest()).toBe(true);
        });
    });

    describe('equals', () => {
        it('should return true for equal UserRoles', () => {
            const role1 = UserRole.superAdmin();
            const role2 = UserRole.superAdmin();

            expect(role1.equals(role2)).toBe(true);
        });

        it('should return false for different UserRoles', () => {
            const role1 = UserRole.superAdmin();
            const role2 = UserRole.user();

            expect(role1.equals(role2)).toBe(false);
        });

        it('should return false for non-UserRole objects', () => {
            const role = UserRole.superAdmin();
            const notRole = { value: 'SUPERADMIN' };

            expect(role.equals(notRole as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the UserRole value as string', () => {
            const role = UserRole.superAdmin();

            expect(role.toString()).toBe('SUPERADMIN');
        });
    });
});
