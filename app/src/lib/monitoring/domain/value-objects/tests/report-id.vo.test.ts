import {ReportId} from '../report-id.vo';

describe('ReportId Value Object', () => {
    describe('create', () => {
        it('should create a ReportId with auto-generated UUID when no value provided', () => {
            const reportId = ReportId.create();

            expect(reportId).toBeInstanceOf(ReportId);
            expect(reportId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should create a ReportId with provided string value', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const reportId = ReportId.create(uuid);

            expect(reportId).toBeInstanceOf(ReportId);
            expect(reportId.getValue()).toBe(uuid);
        });

        it('should create a ReportId with simple string ID', () => {
            const simpleId = 'report-123';
            const reportId = ReportId.create(simpleId);

            expect(reportId).toBeInstanceOf(ReportId);
            expect(reportId.getValue()).toBe(simpleId);
        });
    });

    describe('fromString', () => {
        it('should create a ReportId from valid string', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const reportId = ReportId.fromString(uuid);

            expect(reportId).toBeInstanceOf(ReportId);
            expect(reportId.getValue()).toBe(uuid);
        });

        it('should create a ReportId from simple string', () => {
            const simpleId = 'report-123';
            const reportId = ReportId.fromString(simpleId);

            expect(reportId).toBeInstanceOf(ReportId);
            expect(reportId.getValue()).toBe(simpleId);
        });

        it('should throw error for empty string', () => {
            expect(() => ReportId.fromString('')).toThrow('Report ID cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            expect(() => ReportId.fromString('   ')).toThrow('Report ID cannot be empty');
        });
    });

    describe('equals', () => {
        it('should return true for equal ReportIds', () => {
            const reportId1 = ReportId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const reportId2 = ReportId.fromString('550e8400-e29b-41d4-a716-446655440000');

            expect(reportId1.equals(reportId2)).toBe(true);
        });

        it('should return false for different ReportIds', () => {
            const reportId1 = ReportId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const reportId2 = ReportId.fromString('650e8400-e29b-41d4-a716-446655440000');

            expect(reportId1.equals(reportId2)).toBe(false);
        });

        it('should return false for non-ReportId objects', () => {
            const reportId = ReportId.fromString('550e8400-e29b-41d4-a716-446655440000');
            const notReportId = { value: '550e8400-e29b-41d4-a716-446655440000' };

            expect(reportId.equals(notReportId as any)).toBe(false);
        });
    });

    describe('value property', () => {
        it('should provide access to value via getter', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const reportId = ReportId.fromString(uuid);

            expect(reportId.value).toBe(uuid);
            expect(reportId.getValue()).toBe(uuid);
        });
    });
});
