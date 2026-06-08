import {AlertId} from '../alert-id.vo';

describe('AlertId Value Object', () => {
    describe('create', () => {
        it('should create an AlertId with auto-generated UUID', () => {
            const alertId = AlertId.create();

            expect(alertId).toBeInstanceOf(AlertId);
            expect(alertId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should generate different IDs on each call', () => {
            const id1 = AlertId.create();
            const id2 = AlertId.create();
            expect(id1.getValue()).not.toBe(id2.getValue());
        });
    });

    describe('generate', () => {
        it('should be an alias for create', () => {
            const alertId = AlertId.generate();
            expect(alertId).toBeInstanceOf(AlertId);
            expect(alertId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
    });

    describe('fromString', () => {
        it('should create an AlertId from valid string', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const alertId = AlertId.fromString(uuid);

            expect(alertId).toBeInstanceOf(AlertId);
            expect(alertId.getValue()).toBe(uuid);
        });

        it('should create an AlertId from simple string', () => {
            const simpleId = 'alert-123';
            const alertId = AlertId.fromString(simpleId);

            expect(alertId).toBeInstanceOf(AlertId);
            expect(alertId.getValue()).toBe(simpleId);
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
