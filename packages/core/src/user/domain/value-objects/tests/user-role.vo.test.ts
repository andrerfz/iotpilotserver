import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';

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

        it('should create a UserRole with valid READONLY role', () => {
            const role = UserRole.create('READONLY');

            expect(role).toBeInstanceOf(UserRole);
            expect(role.getValue()).toBe('READONLY');
        });

        it('should throw error for invalid role', () => {
            expect(() => UserRole.create('INVALID_ROLE' as any)).toThrow('Invalid user role: INVALID_ROLE');
        });

        it('should throw error for empty string', () => {
            expect(() => UserRole.create('' as any)).toThrow('Invalid user role: ');
        });
    });

    describe('static factory methods', () => {
        it('should create SUPERADMIN role using superAdmin()', () => {
            const role = UserRole.superAdmin();

            expect(role.getValue()).toBe('SUPERADMIN');
            expect(role.isSuperAdmin()).toBe(true);
        });

        it('should create ADMIN role using admin()', () => {
            const role = UserRole.admin();

            expect(role.getValue()).toBe('ADMIN');
            expect(role.isAdmin()).toBe(true);
        });

        it('should create USER role using user()', () => {
            const role = UserRole.user();

            expect(role.getValue()).toBe('USER');
            expect(role.isUser()).toBe(true);
        });

        it('should create READONLY role using readOnly()', () => {
            const role = UserRole.readOnly();

            expect(role.getValue()).toBe('READONLY');
            expect(role.isReadOnly()).toBe(true);
        });
    });

    describe('role checking methods', () => {
        it('should correctly identify SUPERADMIN role', () => {
            const role = UserRole.superAdmin();

            expect(role.isSuperAdmin()).toBe(true);
            expect(role.isAdmin()).toBe(false);
            expect(role.isUser()).toBe(false);
            expect(role.isReadOnly()).toBe(false);
        });

        it('should correctly identify ADMIN role', () => {
            const role = UserRole.admin();

            expect(role.isSuperAdmin()).toBe(false);
            expect(role.isAdmin()).toBe(true);
            expect(role.isUser()).toBe(false);
            expect(role.isReadOnly()).toBe(false);
        });

        it('should correctly identify USER role', () => {
            const role = UserRole.user();

            expect(role.isSuperAdmin()).toBe(false);
            expect(role.isAdmin()).toBe(false);
            expect(role.isUser()).toBe(true);
            expect(role.isReadOnly()).toBe(false);
        });

        it('should correctly identify READONLY role', () => {
            const role = UserRole.readOnly();

            expect(role.isSuperAdmin()).toBe(false);
            expect(role.isAdmin()).toBe(false);
            expect(role.isUser()).toBe(false);
            expect(role.isReadOnly()).toBe(true);
        });
    });

    describe('role hierarchy', () => {
        it('should support hasRole for hierarchy checks', () => {
            const superAdmin = UserRole.superAdmin();
            const admin = UserRole.admin();
            const user = UserRole.user();
            const readOnly = UserRole.readOnly();

            expect(superAdmin.hasRole('USER')).toBe(true);
            expect(admin.hasRole('USER')).toBe(true);
            expect(user.hasRole('USER')).toBe(true);
            expect(readOnly.hasRole('USER')).toBe(false);
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
    });

    describe('toString', () => {
        it('should return the UserRole value as string', () => {
            const role = UserRole.superAdmin();

            expect(role.toString()).toBe('SUPERADMIN');
        });
    });
});
