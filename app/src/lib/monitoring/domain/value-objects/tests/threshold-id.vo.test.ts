import {ThresholdId} from '../threshold-id.vo';

describe('ThresholdId Value Object', () => {
    describe('create', () => {
        it('should create a ThresholdId with auto-generated UUID when no value provided', () => {
            const thresholdId = ThresholdId.create();

            expect(thresholdId).toBeInstanceOf(ThresholdId);
            expect(thresholdId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should create a ThresholdId with provided string value', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const thresholdId = ThresholdId.create(uuid);

            expect(thresholdId).toBeInstanceOf(ThresholdId);
            expect(thresholdId.getValue()).toBe(uuid);
        });

        it('should create a ThresholdId with simple string ID', () => {
            const simpleId = 'threshold-123';
            const thresholdId = ThresholdId.create(simpleId);

            expect(thresholdId).toBeInstanceOf(ThresholdId);
            expect(thresholdId.getValue()).toBe(simpleId);
        });
    });

    describe('fromString', () => {
        it('should create a ThresholdId from valid string', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const thresholdId = ThresholdId.fromString(uuid);

            expect(thresholdId).toBeInstanceOf(ThresholdId);
            expect(thresholdId.getValue()).toBe(uuid);
        });

        it('should create a ThresholdId from simple string', () => {
            const simpleId = 'threshold-123';
            const thresholdId = ThresholdId.fromString(simpleId);

            expect(thresholdId).toBeInstanceOf(ThresholdId);
            expect(thresholdId.getValue()).toBe(simpleId);
        });

        it('should throw error for empty string', () => {
            expect(() => ThresholdId.fromString('')).toThrow('Threshold ID cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            expect(() => ThresholdId.fromString('   ')).toThrow('Threshold ID cannot be empty');
        });
    });

    describe('equals', () => {
        it('should return true for equal ThresholdIds', () => {
            const thresholdId1 = ThresholdId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const thresholdId2 = ThresholdId.fromString('550e8400-e29b-41d4-a716-446655440000');

            expect(thresholdId1.equals(thresholdId2)).toBe(true);
        });

        it('should return false for different ThresholdIds', () => {
            const thresholdId1 = ThresholdId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const thresholdId2 = ThresholdId.fromString('650e8400-e29b-41d4-a716-446655440000');

            expect(thresholdId1.equals(thresholdId2)).toBe(false);
        });

        it('should return false for non-ThresholdId objects', () => {
            const thresholdId = ThresholdId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const notThresholdId = { value: '550e8400-e29b-41d4-a716-446655440000' };

            expect(thresholdId.equals(notThresholdId as any)).toBe(false);
        });
    });

    describe('value property', () => {
        it('should provide access to value via getter', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const thresholdId = ThresholdId.fromString(uuid);

            expect(thresholdId.value).toBe(uuid);
            expect(thresholdId.getValue()).toBe(uuid);
        });
    });
});
