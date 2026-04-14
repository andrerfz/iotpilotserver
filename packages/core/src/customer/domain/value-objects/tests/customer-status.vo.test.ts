import {CustomerStatus} from '../customer-status.vo';

describe('CustomerStatus Value Object', () => {
    describe('create', () => {
        it('should create a CustomerStatus with valid active status', () => {
            const status = CustomerStatus.create('active');

            expect(status).toBeInstanceOf(CustomerStatus);
            expect(status.getValue()).toBe('active');
            expect(status.isActive()).toBe(true);
        });

        it('should create a CustomerStatus with valid inactive status', () => {
            const status = CustomerStatus.create('inactive');

            expect(status).toBeInstanceOf(CustomerStatus);
            expect(status.getValue()).toBe('inactive');
            expect(status.isInactive()).toBe(true);
        });

        it('should create a CustomerStatus with valid suspended status', () => {
            const status = CustomerStatus.create('suspended');

            expect(status).toBeInstanceOf(CustomerStatus);
            expect(status.getValue()).toBe('suspended');
            expect(status.isSuspended()).toBe(true);
        });

        it('should create a CustomerStatus with valid pending status', () => {
            const status = CustomerStatus.create('pending');

            expect(status).toBeInstanceOf(CustomerStatus);
            expect(status.getValue()).toBe('pending');
            expect(status.isPending()).toBe(true);
        });

        it('should throw error for invalid status', () => {
            expect(() => CustomerStatus.create('INVALID' as any)).toThrow('Invalid customer status: INVALID');
        });
    });

    describe('convenience factory methods', () => {
        it('should create active status', () => {
            const status = CustomerStatus.active();
            expect(status.isActive()).toBe(true);
        });

        it('should create inactive status', () => {
            const status = CustomerStatus.inactive();
            expect(status.isInactive()).toBe(true);
        });

        it('should create suspended status', () => {
            const status = CustomerStatus.suspended();
            expect(status.isSuspended()).toBe(true);
        });

        it('should create pending status', () => {
            const status = CustomerStatus.pending();
            expect(status.isPending()).toBe(true);
        });
    });

    describe('status checking methods', () => {
        it('should correctly identify active status', () => {
            const status = CustomerStatus.active();

            expect(status.isActive()).toBe(true);
            expect(status.isInactive()).toBe(false);
            expect(status.isSuspended()).toBe(false);
            expect(status.isPending()).toBe(false);
        });

        it('should correctly identify inactive status', () => {
            const status = CustomerStatus.inactive();

            expect(status.isActive()).toBe(false);
            expect(status.isInactive()).toBe(true);
            expect(status.isSuspended()).toBe(false);
            expect(status.isPending()).toBe(false);
        });

        it('should correctly identify suspended status', () => {
            const status = CustomerStatus.suspended();

            expect(status.isActive()).toBe(false);
            expect(status.isInactive()).toBe(false);
            expect(status.isSuspended()).toBe(true);
            expect(status.isPending()).toBe(false);
        });

        it('should correctly identify pending status', () => {
            const status = CustomerStatus.pending();

            expect(status.isActive()).toBe(false);
            expect(status.isInactive()).toBe(false);
            expect(status.isSuspended()).toBe(false);
            expect(status.isPending()).toBe(true);
        });
    });

    describe('fromString', () => {
        it('should create status from string', () => {
            const status = CustomerStatus.fromString('active');
            expect(status.isActive()).toBe(true);
        });

        it('should throw for invalid string', () => {
            expect(() => CustomerStatus.fromString('INVALID')).toThrow('Invalid customer status');
        });
    });

    describe('equals', () => {
        it('should return true for equal CustomerStatuses', () => {
            const status1 = CustomerStatus.active();
            const status2 = CustomerStatus.active();

            expect(status1.equals(status2)).toBe(true);
        });

        it('should return false for different CustomerStatuses', () => {
            const status1 = CustomerStatus.active();
            const status2 = CustomerStatus.inactive();

            expect(status1.equals(status2)).toBe(false);
        });
    });
});
