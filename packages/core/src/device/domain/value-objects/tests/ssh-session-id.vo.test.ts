import {SSHSessionId} from '../ssh-session-id.vo';

describe('SSHSessionId Value Object', () => {
    describe('create', () => {
        it('should create an SSHSessionId with auto-generated UUID when no value provided', () => {
            const sshSessionId = SSHSessionId.create();

            expect(sshSessionId).toBeInstanceOf(SSHSessionId);
            expect(sshSessionId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should create an SSHSessionId with provided UUID value', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const sshSessionId = SSHSessionId.create(uuid);

            expect(sshSessionId).toBeInstanceOf(SSHSessionId);
            expect(sshSessionId.getValue()).toBe(uuid);
        });

        it('should create an SSHSessionId with simple string ID', () => {
            const simpleId = 'session-123';
            const sshSessionId = SSHSessionId.create(simpleId);

            expect(sshSessionId).toBeInstanceOf(SSHSessionId);
            expect(sshSessionId.getValue()).toBe(simpleId);
        });
    });

    describe('fromString', () => {
        it('should create an SSHSessionId from valid UUID string', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const sshSessionId = SSHSessionId.fromString(uuid);

            expect(sshSessionId).toBeInstanceOf(SSHSessionId);
            expect(sshSessionId.getValue()).toBe(uuid);
        });

        it('should create an SSHSessionId from simple string', () => {
            const simpleId = 'session-123';
            const sshSessionId = SSHSessionId.fromString(simpleId);

            expect(sshSessionId).toBeInstanceOf(SSHSessionId);
            expect(sshSessionId.getValue()).toBe(simpleId);
        });

        it('should throw error for empty string', () => {
            expect(() => SSHSessionId.fromString('')).toThrow('SSH Session ID cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            expect(() => SSHSessionId.fromString('   ')).toThrow('SSH Session ID cannot be empty');
        });

        it('should throw error for invalid format', () => {
            expect(() => SSHSessionId.fromString('invalid@format')).toThrow('Invalid SSH Session ID format');
        });
    });

    describe('generate', () => {
        it('should generate a new UUID-based SSHSessionId', () => {
            const sshSessionId = SSHSessionId.generate();

            expect(sshSessionId).toBeInstanceOf(SSHSessionId);
            expect(sshSessionId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
    });

    describe('equals', () => {
        it('should return true for equal SSHSessionIds', () => {
            const sshSessionId1 = SSHSessionId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const sshSessionId2 = SSHSessionId.fromString('550e8400-e29b-41d4-a716-446655440000');

            expect(sshSessionId1.equals(sshSessionId2)).toBe(true);
        });

        it('should return false for different SSHSessionIds', () => {
            const sshSessionId1 = SSHSessionId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const sshSessionId2 = SSHSessionId.fromString('650e8400-e29b-41d4-a716-446655440000');

            expect(sshSessionId1.equals(sshSessionId2)).toBe(false);
        });

        it('should return false for non-SSHSessionId objects', () => {
            const sshSessionId = SSHSessionId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const notSSHSessionId = { value: '550e8400-e29b-41d4-a716-446655440000' };

            expect(sshSessionId.equals(notSSHSessionId as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the SSHSessionId value as string', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const sshSessionId = SSHSessionId.fromString(uuid);

            expect(sshSessionId.toString()).toBe(uuid);
        });
    });
});
