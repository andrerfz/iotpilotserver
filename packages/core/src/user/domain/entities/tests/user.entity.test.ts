import {beforeEach, describe, expect, it} from 'vitest';
import {UserEntity} from '../user.entity';
import {UserId} from '../../value-objects/user-id.vo';
import {Email} from '../../value-objects/email.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

describe('User Entity', () => {
    let userId: UserId;
    let email: Email;
    let role: UserRole;
    let customerId: CustomerId;
    let user: UserEntity;

    beforeEach(() => {
        userId = UserId.fromString('user-test-123');
        email = Email.fromString('test@example.com');
        role = UserRole.user();
        customerId = CustomerId.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
        user = UserEntity.create(userId, email, role, customerId);
    });

    it('should create a user with correct values', () => {
        expect(user.getEmail().getValue()).toBe('test@example.com');
        expect(user.getRole().getValue()).toBe('USER');
        expect(user.isActive).toBe(true);
        expect(user.lastLogin).toBeUndefined();
    });

    it('should update email', () => {
        const newEmail = Email.fromString('new@example.com');
        user.updateEmail(newEmail);
        expect(user.getEmail().getValue()).toBe('new@example.com');
    });

    it('should update role', () => {
        const newRole = UserRole.admin();
        user.updateRole(newRole);
        expect(user.getRole().getValue()).toBe('ADMIN');
    });

    it('should record successful login', () => {
        expect(user.lastLogin).toBeUndefined();
        user.recordSuccessfulLogin();
        expect(user.lastLogin).toBeInstanceOf(Date);
    });

    it('should activate and deactivate user', () => {
        expect(user.isActive).toBe(true);
        user.deactivate();
        expect(user.isActive).toBe(false);
        user.activate();
        expect(user.isActive).toBe(true);
    });

    it('should update profile', () => {
        user.updateProfile('John', 'Doe', '+1234567890');
        expect(user.firstName).toBe('John');
        expect(user.lastName).toBe('Doe');
        expect(user.phoneNumber).toBe('+1234567890');
    });
});
