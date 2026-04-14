import {ReportStatus} from '../report-status.vo';

describe('ReportStatus Value Object', () => {
    describe('create', () => {
        it('should create a ReportStatus with valid pending status', () => {
            const status = ReportStatus.create('pending');

            expect(status).toBeInstanceOf(ReportStatus);
            expect(status.getValue()).toBe('pending');
            expect(status.isPending()).toBe(true);
        });

        it('should create a ReportStatus with valid in_progress status', () => {
            const status = ReportStatus.create('in_progress');

            expect(status).toBeInstanceOf(ReportStatus);
            expect(status.getValue()).toBe('in_progress');
            expect(status.isInProgress()).toBe(true);
        });

        it('should create a ReportStatus with valid completed status', () => {
            const status = ReportStatus.create('completed');

            expect(status).toBeInstanceOf(ReportStatus);
            expect(status.getValue()).toBe('completed');
            expect(status.isCompleted()).toBe(true);
        });

        it('should create a ReportStatus with valid failed status', () => {
            const status = ReportStatus.create('failed');

            expect(status).toBeInstanceOf(ReportStatus);
            expect(status.getValue()).toBe('failed');
            expect(status.isFailed()).toBe(true);
        });

        it('should throw error for empty status', () => {
            expect(() => ReportStatus.create('' as any)).toThrow('Report status cannot be empty');
        });

        it('should throw error for invalid status', () => {
            expect(() => ReportStatus.create('invalid' as any)).toThrow(
                'Invalid report status: invalid. Valid values are: pending, in_progress, completed, failed'
            );
        });
    });

    describe('status checking methods', () => {
        it('should correctly identify pending status', () => {
            const status = ReportStatus.create('pending');

            expect(status.isPending()).toBe(true);
            expect(status.isInProgress()).toBe(false);
            expect(status.isCompleted()).toBe(false);
            expect(status.isFailed()).toBe(false);
        });

        it('should correctly identify in_progress status', () => {
            const status = ReportStatus.create('in_progress');

            expect(status.isPending()).toBe(false);
            expect(status.isInProgress()).toBe(true);
            expect(status.isCompleted()).toBe(false);
            expect(status.isFailed()).toBe(false);
        });

        it('should correctly identify completed status', () => {
            const status = ReportStatus.create('completed');

            expect(status.isPending()).toBe(false);
            expect(status.isInProgress()).toBe(false);
            expect(status.isCompleted()).toBe(true);
            expect(status.isFailed()).toBe(false);
        });

        it('should correctly identify failed status', () => {
            const status = ReportStatus.create('failed');

            expect(status.isPending()).toBe(false);
            expect(status.isInProgress()).toBe(false);
            expect(status.isCompleted()).toBe(false);
            expect(status.isFailed()).toBe(true);
        });
    });

    describe('canTransitionTo', () => {
        it('should allow pending to transition to in_progress', () => {
            const pending = ReportStatus.create('pending');
            const inProgress = ReportStatus.create('in_progress');

            expect(pending.canTransitionTo(inProgress)).toBe(true);
        });

        it('should allow pending to transition to completed', () => {
            const pending = ReportStatus.create('pending');
            const completed = ReportStatus.create('completed');

            expect(pending.canTransitionTo(completed)).toBe(true);
        });

        it('should allow pending to transition to failed', () => {
            const pending = ReportStatus.create('pending');
            const failed = ReportStatus.create('failed');

            expect(pending.canTransitionTo(failed)).toBe(true);
        });

        it('should allow in_progress to transition to completed', () => {
            const inProgress = ReportStatus.create('in_progress');
            const completed = ReportStatus.create('completed');

            expect(inProgress.canTransitionTo(completed)).toBe(true);
        });

        it('should allow in_progress to transition to failed', () => {
            const inProgress = ReportStatus.create('in_progress');
            const failed = ReportStatus.create('failed');

            expect(inProgress.canTransitionTo(failed)).toBe(true);
        });

        it('should not allow in_progress to transition back to pending', () => {
            const inProgress = ReportStatus.create('in_progress');
            const pending = ReportStatus.create('pending');

            expect(inProgress.canTransitionTo(pending)).toBe(false);
        });

        it('should not allow completed to transition to any other status', () => {
            const completed = ReportStatus.create('completed');
            const inProgress = ReportStatus.create('in_progress');
            const failed = ReportStatus.create('failed');

            expect(completed.canTransitionTo(inProgress)).toBe(false);
            expect(completed.canTransitionTo(failed)).toBe(false);
        });

        it('should not allow failed to transition to any other status', () => {
            const failed = ReportStatus.create('failed');
            const completed = ReportStatus.create('completed');
            const inProgress = ReportStatus.create('in_progress');

            expect(failed.canTransitionTo(completed)).toBe(false);
            expect(failed.canTransitionTo(inProgress)).toBe(false);
        });
    });

    describe('equals', () => {
        it('should return true for equal ReportStatuses', () => {
            const status1 = ReportStatus.create('pending');
            const status2 = ReportStatus.create('pending');

            expect(status1.equals(status2)).toBe(true);
        });

        it('should return false for different ReportStatuses', () => {
            const status1 = ReportStatus.create('pending');
            const status2 = ReportStatus.create('completed');

            expect(status1.equals(status2)).toBe(false);
        });

        it('should return false for non-ReportStatus objects', () => {
            const status = ReportStatus.create('pending');
            const notStatus = { value: 'pending' };

            expect(status.equals(notStatus as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the ReportStatus value as string', () => {
            const status = ReportStatus.create('pending');

            expect(status.toString()).toBe('pending');
        });
    });

    describe('value property', () => {
        it('should provide access to value via getter', () => {
            const status = ReportStatus.create('pending');

            expect(status.value).toBe('pending');
            expect(status.getValue()).toBe('pending');
        });
    });
});
