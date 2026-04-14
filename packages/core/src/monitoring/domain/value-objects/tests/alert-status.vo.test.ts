import {AlertStatus} from '../alert-status.vo';

describe('AlertStatus Value Object', () => {
  describe('create', () => {
    it('should create valid status values', () => {
      const validStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED'];

      validStatuses.forEach(status => {
        const alertStatus = AlertStatus.create(status);
        expect(alertStatus.value).toBe(status);
      });
    });

    it('should throw error for invalid status', () => {
      expect(() => AlertStatus.create('INVALID')).toThrow('Invalid alert status: INVALID');
    });

    it('should throw error for empty status', () => {
      expect(() => AlertStatus.create('')).toThrow('Invalid alert status: ');
    });

    it('should be case sensitive', () => {
      expect(() => AlertStatus.create('active')).toThrow('Invalid alert status: active');
      expect(() => AlertStatus.create('Acknowledged')).toThrow('Invalid alert status: Acknowledged');
    });
  });

  describe('equals', () => {
    it('should return true for equal statuses', () => {
      const status1 = AlertStatus.create('ACTIVE');
      const status2 = AlertStatus.create('ACTIVE');

      expect(status1.equals(status2)).toBe(true);
    });

    it('should return false for different statuses', () => {
      const status1 = AlertStatus.create('ACTIVE');
      const status2 = AlertStatus.create('RESOLVED');

      expect(status1.equals(status2)).toBe(false);
    });
  });

  describe('status predicates', () => {
    it('should correctly identify ACTIVE status', () => {
      const status = AlertStatus.create('ACTIVE');
      expect(status.isActive()).toBe(true);
      expect(status.isAcknowledged()).toBe(false);
      expect(status.isResolved()).toBe(false);
      expect(status.isSuppressed()).toBe(false);
    });

    it('should correctly identify ACKNOWLEDGED status', () => {
      const status = AlertStatus.create('ACKNOWLEDGED');
      expect(status.isActive()).toBe(false);
      expect(status.isAcknowledged()).toBe(true);
      expect(status.isResolved()).toBe(false);
      expect(status.isSuppressed()).toBe(false);
    });

    it('should correctly identify RESOLVED status', () => {
      const status = AlertStatus.create('RESOLVED');
      expect(status.isActive()).toBe(false);
      expect(status.isAcknowledged()).toBe(false);
      expect(status.isResolved()).toBe(true);
      expect(status.isSuppressed()).toBe(false);
    });

    it('should correctly identify SUPPRESSED status', () => {
      const status = AlertStatus.create('SUPPRESSED');
      expect(status.isActive()).toBe(false);
      expect(status.isAcknowledged()).toBe(false);
      expect(status.isResolved()).toBe(false);
      expect(status.isSuppressed()).toBe(true);
    });
  });

  describe('getValue and value', () => {
    it('should return the status value via getValue()', () => {
      const status = AlertStatus.create('ACTIVE');
      expect(status.getValue()).toBe('ACTIVE');
    });

    it('should return the status value via value getter', () => {
      const status = AlertStatus.create('ACKNOWLEDGED');
      expect(status.value).toBe('ACKNOWLEDGED');
    });
  });

  describe('static constants', () => {
    it('should provide static ACTIVE constant', () => {
      expect(AlertStatus.ACTIVE.value).toBe('ACTIVE');
    });

    it('should provide static ACKNOWLEDGED constant', () => {
      expect(AlertStatus.ACKNOWLEDGED.value).toBe('ACKNOWLEDGED');
    });

    it('should provide static RESOLVED constant', () => {
      expect(AlertStatus.RESOLVED.value).toBe('RESOLVED');
    });

    it('should provide static SUPPRESSED constant', () => {
      expect(AlertStatus.SUPPRESSED.value).toBe('SUPPRESSED');
    });

    it('should return same instance from static constants via fromString', () => {
      const created = AlertStatus.create('ACTIVE');
      expect(created).toBe(AlertStatus.ACTIVE);
    });
  });

  describe('toString', () => {
    it('should return status value as string', () => {
      const status = AlertStatus.create('ACKNOWLEDGED');
      expect(status.toString()).toBe('ACKNOWLEDGED');
    });
  });

  describe('immutability', () => {
    it('should be immutable (props frozen)', () => {
      const status = AlertStatus.create('ACTIVE');
      const original = status.getValue();

      try {
        (status as any).props.value = 'RESOLVED';
      } catch {
        // Expected - frozen object
      }

      expect(status.getValue()).toBe(original);
    });
  });
});
