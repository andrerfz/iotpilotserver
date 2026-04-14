import {MetricId} from '../metric-id.vo';

describe('MetricId Value Object', () => {
    describe('create', () => {
        it('should create a MetricId with auto-generated UUID when no value provided', () => {
            const metricId = MetricId.create();

            expect(metricId).toBeInstanceOf(MetricId);
            expect(metricId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should create a MetricId with provided string value', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const metricId = MetricId.create(uuid);

            expect(metricId).toBeInstanceOf(MetricId);
            expect(metricId.getValue()).toBe(uuid);
        });

        it('should create a MetricId with simple string ID', () => {
            const simpleId = 'metric-123';
            const metricId = MetricId.create(simpleId);

            expect(metricId).toBeInstanceOf(MetricId);
            expect(metricId.getValue()).toBe(simpleId);
        });
    });

    describe('fromString', () => {
        it('should create a MetricId from valid string', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const metricId = MetricId.fromString(uuid);

            expect(metricId).toBeInstanceOf(MetricId);
            expect(metricId.getValue()).toBe(uuid);
        });

        it('should create a MetricId from simple string', () => {
            const simpleId = 'metric-123';
            const metricId = MetricId.fromString(simpleId);

            expect(metricId).toBeInstanceOf(MetricId);
            expect(metricId.getValue()).toBe(simpleId);
        });

        it('should throw error for empty string', () => {
            expect(() => MetricId.fromString('')).toThrow('Metric ID cannot be empty');
        });

        it('should accept whitespace-only string (no trimming)', () => {
            const metricId = MetricId.fromString('   ');
            expect(metricId.getValue()).toBe('   ');
        });
    });

    describe('equals', () => {
        it('should return true for equal MetricIds', () => {
            const metricId1 = MetricId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const metricId2 = MetricId.fromString('550e8400-e29b-41d4-a716-446655440000');

            expect(metricId1.equals(metricId2)).toBe(true);
        });

        it('should return false for different MetricIds', () => {
            const metricId1 = MetricId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const metricId2 = MetricId.fromString('650e8400-e29b-41d4-a716-446655440000');

            expect(metricId1.equals(metricId2)).toBe(false);
        });

        it('should return false for non-MetricId objects', () => {
            const metricId = MetricId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const notMetricId = { value: '550e8400-e29b-41d4-a716-446655440000' };

            expect(metricId.equals(notMetricId as any)).toBe(false);
        });
    });

    describe('value property', () => {
        it('should provide access to value via getter', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const metricId = MetricId.fromString(uuid);

            expect(metricId.value).toBe(uuid);
            expect(metricId.getValue()).toBe(uuid);
        });
    });
});
