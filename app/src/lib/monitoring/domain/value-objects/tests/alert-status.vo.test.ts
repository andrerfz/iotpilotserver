import {AlertStatus} from '../alert-status.vo';

describe('AlertStatus Value Object', () => {
  describe('create', () => {
    it('should create valid status values', () => {
      const validStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'];
      
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
    });

    it('should correctly identify ACKNOWLEDGED status', () => {
      const status = AlertStatus.create('ACKNOWLEDGED');
      expect(status.isActive()).toBe(false);
      expect(status.isAcknowledged()).toBe(true);
      expect(status.isResolved()).toBe(false);
    });

    it('should correctly identify RESOLVED status', () => {
      const status = AlertStatus.create('RESOLVED');
      expect(status.isActive()).toBe(false);
      expect(status.isAcknowledged()).toBe(false);
      expect(status.isResolved()).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('should allow transition from ACTIVE to ACKNOWLEDGED', () => {
      const status = AlertStatus.create('ACTIVE');
      expect(status.canTransitionTo(AlertStatus.create('ACKNOWLEDGED'))).toBe(true);
    });

    it('should allow transition from ACTIVE to RESOLVED', () => {
      const status = AlertStatus.create('ACTIVE');
      expect(status.canTransitionTo(AlertStatus.create('RESOLVED'))).toBe(true);
    });

    it('should allow transition from ACKNOWLEDGED to RESOLVED', () => {
      const status = AlertStatus.create('ACKNOWLEDGED');
      expect(status.canTransitionTo(AlertStatus.create('RESOLVED'))).toBe(true);
    });

    it('should not allow transition from ACKNOWLEDGED to ACTIVE', () => {
      const status = AlertStatus.create('ACKNOWLEDGED');
      expect(status.canTransitionTo(AlertStatus.create('ACTIVE'))).toBe(false);
    });

    it('should not allow transition from RESOLVED to any other status', () => {
      const status = AlertStatus.create('RESOLVED');
      expect(status.canTransitionTo(AlertStatus.create('ACTIVE'))).toBe(false);
      expect(status.canTransitionTo(AlertStatus.create('ACKNOWLEDGED'))).toBe(false);
    });

    it('should not allow transition to the same status', () => {
      const status = AlertStatus.create('ACTIVE');
      expect(status.canTransitionTo(AlertStatus.create('ACTIVE'))).toBe(false);
    });
  });

  describe('status progression', () => {
    it('should correctly identify if status is final', () => {
      expect(AlertStatus.create('ACTIVE').isFinal()).toBe(false);
      expect(AlertStatus.create('ACKNOWLEDGED').isFinal()).toBe(false);
      expect(AlertStatus.create('RESOLVED').isFinal()).toBe(true);
    });

    it('should correctly identify if status needs attention', () => {
      expect(AlertStatus.create('ACTIVE').needsAttention()).toBe(true);
      expect(AlertStatus.create('ACKNOWLEDGED').needsAttention()).toBe(false);
      expect(AlertStatus.create('RESOLVED').needsAttention()).toBe(false);
    });
  });

  describe('color mapping', () => {
    it('should return correct colors for statuses', () => {
      expect(AlertStatus.create('ACTIVE').color).toBe('red');
      expect(AlertStatus.create('ACKNOWLEDGED').color).toBe('yellow');
      expect(AlertStatus.create('RESOLVED').color).toBe('green');
    });
  });

  describe('display properties', () => {
    it('should return correct display names', () => {
      expect(AlertStatus.create('ACTIVE').displayName).toBe('Active');
      expect(AlertStatus.create('ACKNOWLEDGED').displayName).toBe('Acknowledged');
      expect(AlertStatus.create('RESOLVED').displayName).toBe('Resolved');
    });

    it('should return correct descriptions', () => {
      expect(AlertStatus.create('ACTIVE').description).toBe('Alert is active and requires attention');
      expect(AlertStatus.create('ACKNOWLEDGED').description).toBe('Alert has been acknowledged by a user');
      expect(AlertStatus.create('RESOLVED').description).toBe('Alert has been resolved');
    });
  });

  describe('toString', () => {
    it('should return status value as string', () => {
      const status = AlertStatus.create('ACKNOWLEDGED');
      expect(status.toString()).toBe('ACKNOWLEDGED');
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const status = AlertStatus.create('ACTIVE');
      expect(() => {
        (status as any).value = 'RESOLVED';
      }).toThrow();
    });
  });
});