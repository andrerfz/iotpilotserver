import {DeviceMetricsId} from '../device-metrics-id.vo';

describe('DeviceMetricsId Value Object', () => {
    describe('create', () => {
        it('should create a DeviceMetricsId with valid string', () => {
            const id = 'metrics-123';
            const deviceMetricsId = DeviceMetricsId.create(id);

            expect(deviceMetricsId).toBeInstanceOf(DeviceMetricsId);
            expect(deviceMetricsId.getValue()).toBe(id);
        });

        it('should create a DeviceMetricsId with UUID', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const deviceMetricsId = DeviceMetricsId.create(uuid);

            expect(deviceMetricsId).toBeInstanceOf(DeviceMetricsId);
            expect(deviceMetricsId.getValue()).toBe(uuid);
        });

        it('should throw error for empty string', () => {
            expect(() => DeviceMetricsId.create('')).toThrow('DeviceMetricsId cannot be empty');
        });

        it('should throw error for null value', () => {
            expect(() => DeviceMetricsId.create(null as any)).toThrow('DeviceMetricsId cannot be empty');
        });
    });

    describe('equals', () => {
        it('should return true for equal DeviceMetricsIds', () => {
            const id1 = DeviceMetricsId.create('metrics-123');
            const id2 = DeviceMetricsId.create('metrics-123');

            expect(id1.equals(id2)).toBe(true);
        });

        it('should return false for different DeviceMetricsIds', () => {
            const id1 = DeviceMetricsId.create('metrics-123');
            const id2 = DeviceMetricsId.create('metrics-456');

            expect(id1.equals(id2)).toBe(false);
        });

        it('should return false for non-DeviceMetricsId objects', () => {
            const id = DeviceMetricsId.create('metrics-123');
            const notId = { value: 'metrics-123' };

            expect(id.equals(notId as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the DeviceMetricsId value as string', () => {
            const id = DeviceMetricsId.create('metrics-123');

            expect(id.toString()).toBe('metrics-123');
        });
    });
});
