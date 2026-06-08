import {TimeRange} from '../time-range.vo';

describe('TimeRange Value Object', () => {
    const startTime = new Date('2023-01-01T10:00:00Z');
    const endTime = new Date('2023-01-01T11:00:00Z');

    describe('create', () => {
        it('should create a TimeRange with valid dates', () => {
            const timeRange = TimeRange.create(startTime, endTime);

            expect(timeRange).toBeInstanceOf(TimeRange);
            expect(timeRange.getStartTime().getTime()).toBe(startTime.getTime());
            expect(timeRange.getEndTime().getTime()).toBe(endTime.getTime());
        });

        it('should throw error for null start time', () => {
            expect(() => TimeRange.create(null as any, endTime)).toThrow('Start time cannot be empty');
        });

        it('should throw error for null end time', () => {
            expect(() => TimeRange.create(startTime, null as any)).toThrow('End time cannot be empty');
        });

        it('should throw error when start time is after end time', () => {
            const invalidStartTime = new Date('2023-01-01T12:00:00Z');
            const invalidEndTime = new Date('2023-01-01T11:00:00Z');

            expect(() => TimeRange.create(invalidStartTime, invalidEndTime)).toThrow('Start time cannot be after end time');
        });
    });

    describe('createFromDuration', () => {
        it('should create a TimeRange from start time and duration', () => {
            const durationMs = 60 * 60 * 1000; // 1 hour
            const timeRange = TimeRange.createFromDuration(startTime, durationMs);

            expect(timeRange.getStartTime().getTime()).toBe(startTime.getTime());
            expect(timeRange.getEndTime().getTime()).toBe(startTime.getTime() + durationMs);
        });
    });

    describe('createLast24Hours', () => {
        it('should create a TimeRange for the last 24 hours', () => {
            const beforeCreation = new Date();
            const timeRange = TimeRange.createLast24Hours();
            const afterCreation = new Date();

            expect(timeRange.getEndTime().getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
            expect(timeRange.getEndTime().getTime()).toBeLessThanOrEqual(afterCreation.getTime());
            expect(timeRange.getDurationInHours()).toBeCloseTo(24, 1);
        });
    });

    describe('createLastHour', () => {
        it('should create a TimeRange for the last hour', () => {
            const beforeCreation = new Date();
            const timeRange = TimeRange.createLastHour();
            const afterCreation = new Date();

            expect(timeRange.getEndTime().getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
            expect(timeRange.getEndTime().getTime()).toBeLessThanOrEqual(afterCreation.getTime());
            expect(timeRange.getDurationInHours()).toBeCloseTo(1, 1);
        });
    });

    describe('duration calculations', () => {
        it('should calculate duration in milliseconds', () => {
            const timeRange = TimeRange.create(startTime, endTime);
            const expectedDuration = endTime.getTime() - startTime.getTime();

            expect(timeRange.getDurationInMilliseconds()).toBe(expectedDuration);
        });

        it('should calculate duration in seconds', () => {
            const timeRange = TimeRange.create(startTime, endTime);
            const expectedDuration = (endTime.getTime() - startTime.getTime()) / 1000;

            expect(timeRange.getDurationInSeconds()).toBe(expectedDuration);
        });

        it('should calculate duration in minutes', () => {
            const timeRange = TimeRange.create(startTime, endTime);
            const expectedDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

            expect(timeRange.getDurationInMinutes()).toBe(expectedDuration);
        });

        it('should calculate duration in hours', () => {
            const timeRange = TimeRange.create(startTime, endTime);
            const expectedDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

            expect(timeRange.getDurationInHours()).toBe(expectedDuration);
        });
    });

    describe('includes', () => {
        it('should return true for date within range', () => {
            const timeRange = TimeRange.create(startTime, endTime);
            const includedDate = new Date('2023-01-01T10:30:00Z');

            expect(timeRange.includes(includedDate)).toBe(true);
        });

        it('should return true for date equal to start time', () => {
            const timeRange = TimeRange.create(startTime, endTime);

            expect(timeRange.includes(startTime)).toBe(true);
        });

        it('should return true for date equal to end time', () => {
            const timeRange = TimeRange.create(startTime, endTime);

            expect(timeRange.includes(endTime)).toBe(true);
        });

        it('should return false for date before start time', () => {
            const timeRange = TimeRange.create(startTime, endTime);
            const beforeDate = new Date('2023-01-01T09:30:00Z');

            expect(timeRange.includes(beforeDate)).toBe(false);
        });

        it('should return false for date after end time', () => {
            const timeRange = TimeRange.create(startTime, endTime);
            const afterDate = new Date('2023-01-01T11:30:00Z');

            expect(timeRange.includes(afterDate)).toBe(false);
        });
    });

    describe('overlaps', () => {
        it('should return true when ranges overlap', () => {
            const range1 = TimeRange.create(
                new Date('2023-01-01T10:00:00Z'),
                new Date('2023-01-01T12:00:00Z')
            );
            const range2 = TimeRange.create(
                new Date('2023-01-01T11:00:00Z'),
                new Date('2023-01-01T13:00:00Z')
            );

            expect(range1.overlaps(range2)).toBe(true);
            expect(range2.overlaps(range1)).toBe(true);
        });

        it('should return true when one range contains the other', () => {
            const container = TimeRange.create(
                new Date('2023-01-01T10:00:00Z'),
                new Date('2023-01-01T14:00:00Z')
            );
            const contained = TimeRange.create(
                new Date('2023-01-01T11:00:00Z'),
                new Date('2023-01-01T12:00:00Z')
            );

            expect(container.overlaps(contained)).toBe(true);
            expect(contained.overlaps(container)).toBe(true);
        });

        it('should return true when ranges touch at boundary', () => {
            const range1 = TimeRange.create(
                new Date('2023-01-01T10:00:00Z'),
                new Date('2023-01-01T11:00:00Z')
            );
            const range2 = TimeRange.create(
                new Date('2023-01-01T11:00:00Z'),
                new Date('2023-01-01T12:00:00Z')
            );

            expect(range1.overlaps(range2)).toBe(true);
        });

        it('should return false when ranges do not overlap', () => {
            const range1 = TimeRange.create(
                new Date('2023-01-01T10:00:00Z'),
                new Date('2023-01-01T11:00:00Z')
            );
            const range2 = TimeRange.create(
                new Date('2023-01-01T12:00:00Z'),
                new Date('2023-01-01T13:00:00Z')
            );

            expect(range1.overlaps(range2)).toBe(false);
        });
    });

    describe('equals', () => {
        it('should return true for equal TimeRanges', () => {
            const range1 = TimeRange.create(startTime, endTime);
            const range2 = TimeRange.create(new Date(startTime), new Date(endTime));

            expect(range1.equals(range2)).toBe(true);
        });

        it('should return false for different start times', () => {
            const range1 = TimeRange.create(startTime, endTime);
            const range2 = TimeRange.create(new Date('2023-01-01T09:00:00Z'), endTime);

            expect(range1.equals(range2)).toBe(false);
        });

        it('should return false for different end times', () => {
            const range1 = TimeRange.create(startTime, endTime);
            const range2 = TimeRange.create(startTime, new Date('2023-01-01T12:00:00Z'));

            expect(range1.equals(range2)).toBe(false);
        });

        it('should return false for non-TimeRange objects', () => {
            const range = TimeRange.create(startTime, endTime);
            const notRange = { startTime, endTime };

            expect(range.equals(notRange as any)).toBe(false);
        });
    });

    describe('getters return copies', () => {
        it('should return copies of dates to prevent mutation', () => {
            const timeRange = TimeRange.create(startTime, endTime);
            const returnedStartTime = timeRange.getStartTime();
            const returnedEndTime = timeRange.getEndTime();

            returnedStartTime.setFullYear(2020);
            returnedEndTime.setFullYear(2020);

            expect(timeRange.getStartTime().getFullYear()).toBe(2023);
            expect(timeRange.getEndTime().getFullYear()).toBe(2023);
        });
    });

    describe('toString', () => {
        it('should return ISO string representation', () => {
            const timeRange = TimeRange.create(startTime, endTime);
            const result = timeRange.toString();

            expect(result).toContain(startTime.toISOString());
            expect(result).toContain(endTime.toISOString());
            expect(result).toContain(' - ');
        });
    });
});
