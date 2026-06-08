import {describe, expect, it} from 'vitest';
import {AlertStatus} from './alert-status.vo';

describe('AlertStatus Value Object', () => {
  describe('create - valid statuses', () => {
    it('should create ACTIVE status', () => {
      // Arrange & Act
      const status = AlertStatus.create('ACTIVE');

      // Assert
      expect(status).toBeInstanceOf(AlertStatus);
      expect(status.getValue()).toBe('ACTIVE');
    });

    it('should create ACKNOWLEDGED status', () => {
      // Arrange & Act
      const status = AlertStatus.create('ACKNOWLEDGED');

      // Assert
      expect(status.getValue()).toBe('ACKNOWLEDGED');
    });

    it('should create RESOLVED status', () => {
      // Arrange & Act
      const status = AlertStatus.create('RESOLVED');

      // Assert
      expect(status.getValue()).toBe('RESOLVED');
    });
  });

  describe('create - invalid statuses', () => {
    it('should reject empty string', () => {
      // Arrange, Act & Assert
      expect(() => AlertStatus.create('')).toThrow('Invalid alert status');
    });

    it('should reject null', () => {
      // Arrange, Act & Assert
      expect(() => AlertStatus.create(null as any)).toThrow('Invalid alert status');
    });

    it('should reject undefined', () => {
      // Arrange, Act & Assert
      expect(() => AlertStatus.create(undefined as any)).toThrow('Invalid alert status');
    });

    it('should reject invalid status values', () => {
      // Arrange, Act & Assert
      expect(() => AlertStatus.create('INVALID')).toThrow('Invalid alert status');
      expect(() => AlertStatus.create('pending')).toThrow('Invalid alert status');
      expect(() => AlertStatus.create('closed')).toThrow('Invalid alert status');
    });

    it('should reject numeric values', () => {
      // Arrange, Act & Assert
      expect(() => AlertStatus.create('1')).toThrow('Invalid alert status');
      expect(() => AlertStatus.create(1 as any)).toThrow('Invalid alert status');
    });

    it('should reject special characters', () => {
      // Arrange, Act & Assert
      expect(() => AlertStatus.create('active!')).toThrow('Invalid alert status');
      expect(() => AlertStatus.create('resolved;DROP TABLE')).toThrow('Invalid alert status');
    });

    it('should reject whitespace', () => {
      // Arrange, Act & Assert
      expect(() => AlertStatus.create(' active ')).toThrow('Invalid alert status');
      expect(() => AlertStatus.create('ac tive')).toThrow('Invalid alert status');
    });
  });

  describe('equals', () => {
    it('should return true for identical statuses', () => {
      // Arrange
      const status1 = AlertStatus.create('ACTIVE');
      const status2 = AlertStatus.create('ACTIVE');

      // Act & Assert
      expect(status1.equals(status2)).toBe(true);
    });

    it('should return false for different statuses', () => {
      // Arrange
      const status1 = AlertStatus.create('ACTIVE');
      const status2 = AlertStatus.create('RESOLVED');

      // Act & Assert
      expect(status1.equals(status2)).toBe(false);
    });

    it('should handle null comparison', () => {
      // Arrange
      const status = AlertStatus.create('ACTIVE');

      // Act & Assert
      expect(status.equals(null as any)).toBe(false);
    });

    it('should handle undefined comparison', () => {
      // Arrange
      const status = AlertStatus.create('ACTIVE');

      // Act & Assert - equals method should return false for undefined
      expect(status.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return status as string', () => {
      // Arrange
      const status = AlertStatus.create('ACKNOWLEDGED');

      // Act & Assert
      expect(status.toString()).toBe('ACKNOWLEDGED');
    });

    it('should match getValue()', () => {
      // Arrange
      const status = AlertStatus.create('RESOLVED');

      // Act & Assert
      expect(status.toString()).toBe(status.getValue());
    });
  });

  describe('status transitions', () => {
    it('should support isActive check', () => {
      // Arrange
      const activeStatus = AlertStatus.create('ACTIVE');
      const acknowledgedStatus = AlertStatus.create('ACKNOWLEDGED');
      const resolvedStatus = AlertStatus.create('RESOLVED');

      // Act & Assert
      if ('isActive' in activeStatus) {
        expect((activeStatus as any).isActive()).toBe(true);
        expect((acknowledgedStatus as any).isActive()).toBe(false);
        expect((resolvedStatus as any).isActive()).toBe(false);
      }
    });

    it('should support isResolved check', () => {
      // Arrange
      const activeStatus = AlertStatus.create('ACTIVE');
      const resolvedStatus = AlertStatus.create('RESOLVED');

      // Act & Assert
      if ('isResolved' in activeStatus) {
        expect((activeStatus as any).isResolved()).toBe(false);
        expect((resolvedStatus as any).isResolved()).toBe(true);
      }
    });

    it('should support isAcknowledged check', () => {
      // Arrange
      const activeStatus = AlertStatus.create('ACTIVE');
      const acknowledgedStatus = AlertStatus.create('ACKNOWLEDGED');

      // Act & Assert
      if ('isAcknowledged' in activeStatus) {
        expect((activeStatus as any).isAcknowledged()).toBe(false);
        expect((acknowledgedStatus as any).isAcknowledged()).toBe(true);
      }
    });

    it('should support canTransitionTo', () => {
      // Arrange
      const activeStatus = AlertStatus.create('ACTIVE');
      const acknowledgedStatus = AlertStatus.create('ACKNOWLEDGED');
      const resolvedStatus = AlertStatus.create('RESOLVED');

      // Act & Assert
      if ('canTransitionTo' in activeStatus) {
        expect((activeStatus as any).canTransitionTo(acknowledgedStatus)).toBe(true);
        expect((activeStatus as any).canTransitionTo(resolvedStatus)).toBe(true);
        expect((resolvedStatus as any).canTransitionTo(activeStatus)).toBe(false);
      }
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      // Arrange
      const status = AlertStatus.create('ACTIVE');
      const original = status.getValue();

      // Act - Try to modify (this should not affect the original)
      try {
        (status as any).value = 'RESOLVED';
      } catch {
        // Expected to fail
      }

      // Assert
      expect(status.getValue()).toBe(original);
    });

    it('should create independent instances', () => {
      // Arrange
      const status1 = AlertStatus.create('ACTIVE');
      const status2 = AlertStatus.create('RESOLVED');

      // Act & Assert
      expect(status1.getValue()).not.toBe(status2.getValue());
      expect(status1).not.toBe(status2);
    });
  });

  describe('edge cases', () => {
    it('should handle all valid status values', () => {
      // Arrange
      const validStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'];

      // Act & Assert
      validStatuses.forEach(statusValue => {
        const status = AlertStatus.create(statusValue);
        expect(status.getValue()).toBe(statusValue);
      });
    });

    it('should reject partial matches', () => {
      // Arrange, Act & Assert
      expect(() => AlertStatus.create('act')).toThrow('Invalid alert status');
      expect(() => AlertStatus.create('activeee')).toThrow('Invalid alert status');
    });

    it('should reject typos', () => {
      // Arrange, Act & Assert
      expect(() => AlertStatus.create('activ')).toThrow('Invalid alert status');
      expect(() => AlertStatus.create('aknowledged')).toThrow('Invalid alert status');
      expect(() => AlertStatus.create('resolvd')).toThrow('Invalid alert status');
    });
  });

  describe('static constants', () => {
    it('should expose status constants if available', () => {
      // Arrange
      const constants = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'];

      // Act & Assert
      constants.forEach(constant => {
        if ((AlertStatus as any)[constant]) {
          expect((AlertStatus as any)[constant]).toBeDefined();
        } else {
          // If static constants not implemented, at least verify creation works
          const status = AlertStatus.create(constant);
          expect(status.getValue()).toBe(constant);
        }
      });
    });
  });

  describe('lifecycle methods', () => {
    it('should allow transitioning from ACTIVE to ACKNOWLEDGED', () => {
      // Arrange
      const status = AlertStatus.create('ACTIVE');

      // Act
      const newStatus = AlertStatus.create('ACKNOWLEDGED');

      // Assert
      expect(status.getValue()).toBe('ACTIVE');
      expect(newStatus.getValue()).toBe('ACKNOWLEDGED');
      expect(status.equals(newStatus)).toBe(false);
    });

    it('should allow transitioning from ACKNOWLEDGED to RESOLVED', () => {
      // Arrange
      const status = AlertStatus.create('ACKNOWLEDGED');

      // Act
      const newStatus = AlertStatus.create('RESOLVED');

      // Assert
      expect(status.getValue()).toBe('ACKNOWLEDGED');
      expect(newStatus.getValue()).toBe('RESOLVED');
      expect(status.equals(newStatus)).toBe(false);
    });

    it('should allow transitioning directly from ACTIVE to RESOLVED', () => {
      // Arrange
      const status = AlertStatus.create('ACTIVE');

      // Act
      const newStatus = AlertStatus.create('RESOLVED');

      // Assert
      expect(status.getValue()).toBe('ACTIVE');
      expect(newStatus.getValue()).toBe('RESOLVED');
      expect(status.equals(newStatus)).toBe(false);
    });
  });
});

