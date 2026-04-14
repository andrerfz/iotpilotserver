import {AlertSeverity} from '../alert-severity.vo';

describe('AlertSeverity Value Object', () => {
  describe('create', () => {
    it('should create valid severity levels', () => {
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      validSeverities.forEach(severity => {
        const alertSeverity = AlertSeverity.create(severity);
        expect(alertSeverity.value).toBe(severity);
      });
    });

    it('should throw error for invalid severity level', () => {
      expect(() => AlertSeverity.create('INVALID')).toThrow('Invalid alert severity: INVALID');
    });

    it('should throw error for empty severity', () => {
      expect(() => AlertSeverity.create('')).toThrow('Invalid alert severity: ');
    });

    it('should be case sensitive', () => {
      expect(() => AlertSeverity.create('low')).toThrow('Invalid alert severity: low');
      expect(() => AlertSeverity.create('Medium')).toThrow('Invalid alert severity: Medium');
    });
  });

  describe('equals', () => {
    it('should return true for equal severities', () => {
      const severity1 = AlertSeverity.create('HIGH');
      const severity2 = AlertSeverity.create('HIGH');

      expect(severity1.equals(severity2)).toBe(true);
    });

    it('should return false for different severities', () => {
      const severity1 = AlertSeverity.create('HIGH');
      const severity2 = AlertSeverity.create('LOW');

      expect(severity1.equals(severity2)).toBe(false);
    });
  });

  describe('severity levels', () => {
    it('should correctly identify LOW severity', () => {
      const severity = AlertSeverity.create('LOW');
      expect(severity.isLow()).toBe(true);
      expect(severity.isMedium()).toBe(false);
      expect(severity.isHigh()).toBe(false);
      expect(severity.isCritical()).toBe(false);
    });

    it('should correctly identify MEDIUM severity', () => {
      const severity = AlertSeverity.create('MEDIUM');
      expect(severity.isLow()).toBe(false);
      expect(severity.isMedium()).toBe(true);
      expect(severity.isHigh()).toBe(false);
      expect(severity.isCritical()).toBe(false);
    });

    it('should correctly identify HIGH severity', () => {
      const severity = AlertSeverity.create('HIGH');
      expect(severity.isLow()).toBe(false);
      expect(severity.isMedium()).toBe(false);
      expect(severity.isHigh()).toBe(true);
      expect(severity.isCritical()).toBe(false);
    });

    it('should correctly identify CRITICAL severity', () => {
      const severity = AlertSeverity.create('CRITICAL');
      expect(severity.isLow()).toBe(false);
      expect(severity.isMedium()).toBe(false);
      expect(severity.isHigh()).toBe(false);
      expect(severity.isCritical()).toBe(true);
    });
  });

  describe('level ordering', () => {
    it('should have correct level values', () => {
      const low = AlertSeverity.create('LOW');
      const medium = AlertSeverity.create('MEDIUM');
      const high = AlertSeverity.create('HIGH');
      const critical = AlertSeverity.create('CRITICAL');

      expect(low.level).toBe(1);
      expect(medium.level).toBe(2);
      expect(high.level).toBe(3);
      expect(critical.level).toBe(4);
    });

    it('should compare severities with isHigherThan', () => {
      const low = AlertSeverity.create('LOW');
      const medium = AlertSeverity.create('MEDIUM');
      const high = AlertSeverity.create('HIGH');
      const critical = AlertSeverity.create('CRITICAL');

      expect(critical.isHigherThan(high)).toBe(true);
      expect(high.isHigherThan(medium)).toBe(true);
      expect(medium.isHigherThan(low)).toBe(true);

      expect(low.isHigherThan(medium)).toBe(false);
      expect(low.isHigherThan(low)).toBe(false);
      expect(high.isHigherThan(high)).toBe(false);
    });
  });

  describe('static constants', () => {
    it('should expose severity constants', () => {
      expect(AlertSeverity.LOW).toBeDefined();
      expect(AlertSeverity.MEDIUM).toBeDefined();
      expect(AlertSeverity.HIGH).toBeDefined();
      expect(AlertSeverity.CRITICAL).toBeDefined();

      expect(AlertSeverity.LOW.value).toBe('LOW');
      expect(AlertSeverity.MEDIUM.value).toBe('MEDIUM');
      expect(AlertSeverity.HIGH.value).toBe('HIGH');
      expect(AlertSeverity.CRITICAL.value).toBe('CRITICAL');
    });
  });

  describe('toString', () => {
    it('should return severity value as string', () => {
      const severity = AlertSeverity.create('HIGH');
      expect(severity.toString()).toBe('HIGH');
    });
  });
});
