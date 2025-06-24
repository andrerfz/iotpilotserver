import {describe, it, expect, beforeEach} from 'vitest';
import {User} from '../user.entity';
import {UserId} from '../../value-objects/user-id.vo';
import {Email} from '../../value-objects/email.vo';
import {Password} from '../../value-objects/password.vo';
import {UserRole, UserRoleEnum} from '../../value-objects/user-role.vo';

describe('User Entity', () => {
    let userId: UserId;
    let email: Email;
    let password: Password;
    let role: UserRole;
    let user: User;

    beforeEach(() => {
        userId = UserId.generate();
        email = Email.create('test@example.com');
        password = Password.createHashed('hashed_password');
        role = UserRole.user();
        user = User.create(userId, email, password, role);
    });

    it('should create a user with correct values', () => {
        expect(user.getId()).toBe(userId);
        expect(user.getEmail()).toBe(email);
        expect(user.getPassword()).toBe(password);
        expect(user.getRole()).toBe(role);
        expect(user.isActive()).toBe(true);
        expect(user.getLastLoginAt()).toBeNull();
    });

    it('should update email', () => {
        const newEmail = Email.create('new@example.com');
        user.updateEmail(newEmail);
        expect(user.getEmail()).toBe(newEmail);
    });

    it('should update password', () => {
        const newPassword = Password.createHashed('new_hashed_password');
        user.updatePassword(newPassword);
        expect(user.getPassword()).toBe(newPassword);
    });

    it('should update role', () => {
        const newRole = UserRole.admin();
        user.updateRole(newRole);
        expect(user.getRole()).toBe(newRole);
    });

    it('should record login', () => {
        expect(user.getLastLoginAt()).toBeNull();
        user.recordLogin();
        expect(user.getLastLoginAt()).toBeInstanceOf(Date);
    });

    it('should activate and deactivate user', () => {
        expect(user.isActive()).toBe(true);
        user.deactivate();
        expect(user.isActive()).toBe(false);
        user.activate();
        expect(user.isActive()).toBe(true);
    });
});