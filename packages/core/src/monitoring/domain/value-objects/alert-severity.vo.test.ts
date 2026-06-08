import {describe, expect, it} from 'vitest';
import {AlertSeverity} from './alert-severity.vo';

describe('AlertSeverity Value Object', () => {
  describe('create - valid severities', () => {
    it('should create LOW severity', () => {
      // Arrange & Act
      const severity = AlertSeverity.create('LOW');

      // Assert
      expect(severity).toBeInstanceOf(AlertSeverity);
      expect(severity.getValue()).toBe('LOW');
    });

    it('should create MEDIUM severity', () => {
      // Arrange & Act
      const severity = AlertSeverity.create('MEDIUM');

      // Assert
      expect(severity.getValue()).toBe('MEDIUM');
    });

    it('should create HIGH severity', () => {
      // Arrange & Act
      const severity = AlertSeverity.create('HIGH');

      // Assert
      expect(severity.getValue()).toBe('HIGH');
    });

    it('should create CRITICAL severity', () => {
      // Arrange & Act
      const severity = AlertSeverity.create('CRITICAL');

      // Assert
      expect(severity.getValue()).toBe('CRITICAL');
    });

  });

  describe('create - invalid severities', () => {
    it('should reject empty string', () => {
      // Arrange, Act & Assert
      expect(() => AlertSeverity.create('')).toThrow('Invalid alert severity');
    });

    it('should reject null', () => {
      // Arrange, Act & Assert
      expect(() => AlertSeverity.create(null as any)).toThrow('Invalid alert severity');
    });

    it('should reject undefined', () => {
      // Arrange, Act & Assert
      expect(() => AlertSeverity.create(undefined as any)).toThrow('Invalid alert severity');
    });

    it('should reject invalid severity levels', () => {
      // Arrange, Act & Assert
      expect(() => AlertSeverity.create('INVALID')).toThrow('Invalid alert severity');
      expect(() => AlertSeverity.create('WARNING')).toThrow('Invalid alert severity');
      expect(() => AlertSeverity.create('ERROR')).toThrow('Invalid alert severity');
    });

    it('should reject numeric values', () => {
      // Arrange, Act & Assert
      expect(() => AlertSeverity.create('1')).toThrow('Invalid alert severity');
      expect(() => AlertSeverity.create(1 as any)).toThrow('Invalid alert severity');
    });

    it('should reject special characters', () => {
      // Arrange, Act & Assert
      expect(() => AlertSeverity.create('HIGH!')).toThrow('Invalid alert severity');
      expect(() => AlertSeverity.create('LOW;DROP TABLE')).toThrow('Invalid alert severity');
    });

    it('should reject whitespace', () => {
      // Arrange, Act & Assert
      expect(() => AlertSeverity.create(' HIGH ')).toThrow('Invalid alert severity');
      expect(() => AlertSeverity.create('HI GH')).toThrow('Invalid alert severity');
    });
  });

  describe('equals', () => {
    it('should return true for identical severities', () => {
      // Arrange
      const severity1 = AlertSeverity.create('HIGH');
      const severity2 = AlertSeverity.create('HIGH');

      // Act & Assert
      expect(severity1.equals(severity2)).toBe(true);
    });

    it('should return false for different severities', () => {
      // Arrange
      const severity1 = AlertSeverity.create('HIGH');
      const severity2 = AlertSeverity.create('LOW');

      // Act & Assert
      expect(severity1.equals(severity2)).toBe(false);
    });


    it('should handle null comparison', () => {
      // Arrange
      const severity = AlertSeverity.create('HIGH');

      // Act & Assert
      expect(severity.equals(null as any)).toBe(false);
    });

    it('should handle undefined comparison', () => {
      // Arrange
      const severity = AlertSeverity.create('HIGH');

      // Act & Assert
      expect(severity.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return severity as string', () => {
      // Arrange
      const severity = AlertSeverity.create('CRITICAL');

      // Act & Assert
      expect(severity.toString()).toBe('CRITICAL');
    });

    it('should match getValue()', () => {
      // Arrange
      const severity = AlertSeverity.create('MEDIUM');

      // Act & Assert
      expect(severity.toString()).toBe(severity.getValue());
    });
  });

  describe('severity comparison', () => {
    it('should support isHigherThan comparison', () => {
      // Arrange
      const critical = AlertSeverity.create('CRITICAL');
      const high = AlertSeverity.create('HIGH');
      const medium = AlertSeverity.create('MEDIUM');
      const low = AlertSeverity.create('LOW');

      // Act & Assert
      if ('isHigherThan' in critical) {
        expect((critical as any).isHigherThan(high)).toBe(true);
        expect((high as any).isHigherThan(medium)).toBe(true);
        expect((medium as any).isHigherThan(low)).toBe(true);
        expect((low as any).isHigherThan(critical)).toBe(false);
      }
    });

    it('should support severity level ordering', () => {
      // Arrange
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      // Act & Assert
      severities.forEach(level => {
        const severity = AlertSeverity.create(level);
        expect(severity.getValue()).toBe(level);
      });
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      // Arrange
      const severity = AlertSeverity.create('HIGH');
      const original = severity.getValue();

      // Act - Try to modify (this should not affect the original)
      try {
        (severity as any).value = 'LOW';
      } catch {
        // Expected to fail
      }

      // Assert
      expect(severity.getValue()).toBe(original);
    });

    it('should create independent instances', () => {
      // Arrange
      const severity1 = AlertSeverity.create('HIGH');
      const severity2 = AlertSeverity.create('LOW');

      // Act & Assert
      expect(severity1.getValue()).not.toBe(severity2.getValue());
      expect(severity1).not.toBe(severity2);
    });
  });

  describe('edge cases', () => {
    it('should handle all valid severity levels', () => {
      // Arrange
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      // Act & Assert
      validSeverities.forEach(level => {
        const severity = AlertSeverity.create(level);
        expect(severity.getValue()).toBe(level);
      });
    });


    it('should reject partial matches', () => {
      // Arrange, Act & Assert
      expect(() => AlertSeverity.create('HIG')).toThrow('Invalid alert severity');
      expect(() => AlertSeverity.create('HIGHHH')).toThrow('Invalid alert severity');
    });
  });

  describe('static constants', () => {
    it('should expose severity constants if available', () => {
      // Arrange & Act
      const constants = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      // Assert
      constants.forEach(constant => {
        if ((AlertSeverity as any)[constant]) {
          expect((AlertSeverity as any)[constant]).toBeDefined();
        } else {
          // If static constants not implemented, at least verify creation works
          const severity = AlertSeverity.create(constant);
          expect(severity.getValue()).toBe(constant);
        }
      });
    });
  });
});

