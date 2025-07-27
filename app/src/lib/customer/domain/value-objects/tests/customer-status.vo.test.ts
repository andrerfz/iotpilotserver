import {CustomerStatus, CustomerStatusEnum} from '../customer-status.vo';

describe('CustomerStatus Value Object', () => {
    describe('constructor', () => {
        it('should create a CustomerStatus with valid ACTIVE status', () => {
            const status = new CustomerStatus(CustomerStatusEnum.ACTIVE);

            expect(status).toBeInstanceOf(CustomerStatus);
            expect(status.getValue()).toBe(CustomerStatusEnum.ACTIVE);
            expect(status.isActive()).toBe(true);
        });

        it('should create a CustomerStatus with valid INACTIVE status', () => {
            const status = new CustomerStatus(CustomerStatusEnum.INACTIVE);

            expect(status).toBeInstanceOf(CustomerStatus);
            expect(status.getValue()).toBe(CustomerStatusEnum.INACTIVE);
            expect(status.isInactive()).toBe(true);
        });

        it('should create a CustomerStatus with valid SUSPENDED status', () => {
            const status = new CustomerStatus(CustomerStatusEnum.SUSPENDED);

            expect(status).toBeInstanceOf(CustomerStatus);
            expect(status.getValue()).toBe(CustomerStatusEnum.SUSPENDED);
            expect(status.isSuspended()).toBe(true);
        });

        it('should create a CustomerStatus with valid PENDING status', () => {
            const status = new CustomerStatus(CustomerStatusEnum.PENDING);

            expect(status).toBeInstanceOf(CustomerStatus);
            expect(status.getValue()).toBe(CustomerStatusEnum.PENDING);
            expect(status.isPending()).toBe(true);
        });

        it('should throw error for invalid status', () => {
            expect(() => new CustomerStatus('INVALID' as any)).toThrow('Invalid customer status: INVALID');
        });
    });

    describe('status checking methods', () => {
        it('should correctly identify ACTIVE status', () => {
            const status = new CustomerStatus(CustomerStatusEnum.ACTIVE);

            expect(status.isActive()).toBe(true);
            expect(status.isInactive()).toBe(false);
            expect(status.isSuspended()).toBe(false);
            expect(status.isPending()).toBe(false);
        });

        it('should correctly identify INACTIVE status', () => {
            const status = new CustomerStatus(CustomerStatusEnum.INACTIVE);

            expect(status.isActive()).toBe(false);
            expect(status.isInactive()).toBe(true);
            expect(status.isSuspended()).toBe(false);
            expect(status.isPending()).toBe(false);
        });

        it('should correctly identify SUSPENDED status', () => {
            const status = new CustomerStatus(CustomerStatusEnum.SUSPENDED);

            expect(status.isActive()).toBe(false);
            expect(status.isInactive()).toBe(false);
            expect(status.isSuspended()).toBe(true);
            expect(status.isPending()).toBe(false);
        });

        it('should correctly identify PENDING status', () => {
            const status = new CustomerStatus(CustomerStatusEnum.PENDING);

            expect(status.isActive()).toBe(false);
            expect(status.isInactive()).toBe(false);
            expect(status.isSuspended()).toBe(false);
            expect(status.isPending()).toBe(true);
        });
    });

    describe('equals', () => {
        it('should return true for equal CustomerStatuses', () => {
            const status1 = new CustomerStatus(CustomerStatusEnum.ACTIVE);
            const status2 = new CustomerStatus(CustomerStatusEnum.ACTIVE);

            expect(status1.equals(status2)).toBe(true);
        });

        it('should return false for different CustomerStatuses', () => {
            const status1 = new CustomerStatus(CustomerStatusEnum.ACTIVE);
            const status2 = new CustomerStatus(CustomerStatusEnum.INACTIVE);

            expect(status1.equals(status2)).toBe(false);
        });

        it('should return false for non-CustomerStatus objects', () => {
            const status = new CustomerStatus(CustomerStatusEnum.ACTIVE);
            const notStatus = { value: CustomerStatusEnum.ACTIVE };

            expect(status.equals(notStatus as any)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the CustomerStatus value as string', () => {
            const status = new CustomerStatus(CustomerStatusEnum.ACTIVE);

            expect(status.toString()).toBe('ACTIVE');
        });
    });
});
