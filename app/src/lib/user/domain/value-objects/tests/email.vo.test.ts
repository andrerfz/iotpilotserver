import {describe, it, expect} from 'vitest';
import {Email} from '../email.vo';

describe('Email Value Object', () => {
    it('should create a valid email', () => {
        const email = Email.create('test@example.com');
        expect(email.getValue()).toBe('test@example.com');
    });

    it('should throw an error for invalid email format', () => {
        expect(() => Email.create('invalid-email')).toThrow('Invalid email format');
    });

    it('should trim and lowercase email on creation', () => {
        const email = Email.create('  TEST@EXAMPLE.COM  ');
        expect(email.getValue()).toBe('test@example.com');
    });

    it('should correctly check equality', () => {
        const email1 = Email.create('test@example.com');
        const email2 = Email.create('test@example.com');
        const email3 = Email.create('other@example.com');

        expect(email1.equals(email2)).toBe(true);
        expect(email1.equals(email3)).toBe(false);
    });
});