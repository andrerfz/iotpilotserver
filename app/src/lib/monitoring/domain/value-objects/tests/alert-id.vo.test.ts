import {AlertId} from '../alert-id.vo';

describe('AlertId Value Object', () => {
    describe('create', () => {
        it('should create an AlertId with auto-generated UUID when no value provided', () => {
            const alertId = AlertId.create();

            expect(alertId).toBeInstanceOf(AlertId);
            expect(alertId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should create an AlertId with provided string value', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const alertId = AlertId.create(uuid);

            expect(alertId).toBeInstanceOf(AlertId);
            expect(alertId.getValue()).toBe(uuid);
        });

        it('should create an AlertId with simple string ID', () => {
            const simpleId = 'alert-123';
            const alertId = AlertId.create(simpleId);

            expect(alertId).toBeInstanceOf(AlertId);
            expect(alertId.getValue()).toBe(simpleId);
        });
    });

    describe('fromString', () => {
        it('should create an AlertId from valid string', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const alertId = AlertId.fromString(uuid);

            expect(alertId).toBeInstanceOf(AlertId);
            expect(alertId.getValue()).toBe(uuid);
        });

        it('should throw error for empty string', () => {
            expect(() => AlertId.fromString('')).toThrow('Alert ID cannot be empty');
        });

        it('should accept whitespace-only string as valid (no trimming)', () => {
            const alertId = AlertId.fromString('   ');
            expect(alertId.getValue()).toBe('   ');
        });
    });

    describe('equals', () => {
        it('should return true for equal AlertIds', () => {
            const alertId1 = AlertId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const alertId2 = AlertId.fromString('550e8400-e29b-41d4-a716-446655440000');

            expect(alertId1.equals(alertId2)).toBe(true);
        });

        it('should return false for different AlertIds', () => {
            const alertId1 = AlertId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const alertId2 = AlertId.fromString('650e8400-e29b-41d4-a716-446655440000');

            expect(alertId1.equals(alertId2)).toBe(false);
        });

        it('should return false for non-AlertId objects', () => {
            const alertId = AlertId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const notAlertId = { value: '550e8400-e29b-41d4-a716-446655440000' };

            expect(alertId.equals(notAlertId as any)).toBe(false);
        });
    });

    describe('value property', () => {
        it('should provide access to value via getter', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const alertId = AlertId.fromString(uuid);

            expect(alertId.value).toBe(uuid);
            expect(alertId.getValue()).toBe(uuid);
        });
    });
});
