import {MetricValue} from '../metric-value.vo';

describe('MetricValue Value Object', () => {
  describe('create', () => {
    it('should create valid metric value with number and unit', () => {
      const metricValue = MetricValue.create(85.5, 'percentage');
      expect(metricValue.value).toBe(85.5);
      expect(metricValue.unit).toBe('percentage');
    });

    it('should create metric value with integer', () => {
      const metricValue = MetricValue.create(100, 'MB');
      expect(metricValue.value).toBe(100);
      expect(metricValue.unit).toBe('MB');
    });

    it('should create metric value with zero', () => {
      const metricValue = MetricValue.create(0, 'count');
      expect(metricValue.value).toBe(0);
      expect(metricValue.unit).toBe('count');
    });

    it('should create metric value with negative number', () => {
      const metricValue = MetricValue.create(-10.5, 'celsius');
      expect(metricValue.value).toBe(-10.5);
      expect(metricValue.unit).toBe('celsius');
    });

    it('should throw error for NaN value', () => {
      expect(() => MetricValue.create(NaN, 'unit')).toThrow('Metric value cannot be NaN');
    });

    it('should throw error for infinite value', () => {
      expect(() => MetricValue.create(Infinity, 'unit')).toThrow('Metric value cannot be infinite');
      expect(() => MetricValue.create(-Infinity, 'unit')).toThrow('Metric value cannot be infinite');
    });

    it('should throw error for empty unit', () => {
      expect(() => MetricValue.create(85.5, '')).toThrow('Metric unit cannot be empty');
    });

    it('should throw error for null unit', () => {
      expect(() => MetricValue.create(85.5, null as any)).toThrow('Metric unit cannot be empty');
    });
  });

  describe('equals', () => {
    it('should return true for equal metric values', () => {
      const value1 = MetricValue.create(85.5, 'percentage');
      const value2 = MetricValue.create(85.5, 'percentage');
      
      expect(value1.equals(value2)).toBe(true);
    });

    it('should return false for different values with same unit', () => {
      const value1 = MetricValue.create(85.5, 'percentage');
      const value2 = MetricValue.create(90.0, 'percentage');
      
      expect(value1.equals(value2)).toBe(false);
    });

    it('should return false for same values with different units', () => {
      const value1 = MetricValue.create(85.5, 'percentage');
      const value2 = MetricValue.create(85.5, 'MB');
      
      expect(value1.equals(value2)).toBe(false);
    });

    it('should handle floating point precision', () => {
      const value1 = MetricValue.create(0.1 + 0.2, 'unit');
      const value2 = MetricValue.create(0.3, 'unit');
      
      expect(value1.equals(value2)).toBe(true);
    });
  });

  describe('comparison operations', () => {
    it('should compare values with same unit', () => {
      const value1 = MetricValue.create(85.5, 'percentage');
      const value2 = MetricValue.create(90.0, 'percentage');
      const value3 = MetricValue.create(85.5, 'percentage');

      expect(value1.isLessThan(value2)).toBe(true);
      expect(value2.isGreaterThan(value1)).toBe(true);
      expect(value1.isLessThanOrEqual(value3)).toBe(true);
      expect(value1.isGreaterThanOrEqual(value3)).toBe(true);
      expect(value1.isLessThanOrEqual(value2)).toBe(true);
      expect(value2.isGreaterThanOrEqual(value1)).toBe(true);
    });

    it('should throw error when comparing different units', () => {
      const value1 = MetricValue.create(85.5, 'percentage');
      const value2 = MetricValue.create(1024, 'MB');

      expect(() => value1.isLessThan(value2)).toThrow('Cannot compare metric values with different units: percentage vs MB');
      expect(() => value1.isGreaterThan(value2)).toThrow('Cannot compare metric values with different units: percentage vs MB');
      expect(() => value1.isLessThanOrEqual(value2)).toThrow('Cannot compare metric values with different units: percentage vs MB');
      expect(() => value1.isGreaterThanOrEqual(value2)).toThrow('Cannot compare metric values with different units: percentage vs MB');
    });
  });

  describe('arithmetic operations', () => {
    it('should add values with same unit', () => {
      const value1 = MetricValue.create(25.5, 'MB');
      const value2 = MetricValue.create(74.5, 'MB');
      const result = value1.add(value2);

      expect(result.value).toBe(100);
      expect(result.unit).toBe('MB');
    });

    it('should subtract values with same unit', () => {
      const value1 = MetricValue.create(100, 'MB');
      const value2 = MetricValue.create(25.5, 'MB');
      const result = value1.subtract(value2);

      expect(result.value).toBe(74.5);
      expect(result.unit).toBe('MB');
    });

    it('should multiply value by scalar', () => {
      const value = MetricValue.create(50, 'percentage');
      const result = value.multiplyBy(1.5);

      expect(result.value).toBe(75);
      expect(result.unit).toBe('percentage');
    });

    it('should divide value by scalar', () => {
      const value = MetricValue.create(100, 'MB');
      const result = value.divideBy(4);

      expect(result.value).toBe(25);
      expect(result.unit).toBe('MB');
    });

    it('should throw error when adding different units', () => {
      const value1 = MetricValue.create(85.5, 'percentage');
      const value2 = MetricValue.create(1024, 'MB');

      expect(() => value1.add(value2)).toThrow('Cannot perform arithmetic with different units: percentage vs MB');
    });

    it('should throw error when subtracting different units', () => {
      const value1 = MetricValue.create(85.5, 'percentage');
      const value2 = MetricValue.create(1024, 'MB');

      expect(() => value1.subtract(value2)).toThrow('Cannot perform arithmetic with different units: percentage vs MB');
    });

    it('should throw error when dividing by zero', () => {
      const value = MetricValue.create(100, 'MB');
      expect(() => value.divideBy(0)).toThrow('Cannot divide by zero');
    });
  });

  describe('formatting', () => {
    it('should format value with unit', () => {
      const value = MetricValue.create(85.5, 'percentage');
      expect(value.format()).toBe('85.5 percentage');
    });

    it('should format with custom precision', () => {
      const value = MetricValue.create(85.555555, 'percentage');
      expect(value.format(2)).toBe('85.56 percentage');
    });

    it('should format integer without decimals', () => {
      const value = MetricValue.create(100, 'MB');
      expect(value.format()).toBe('100 MB');
    });

    it('should format with no decimals when precision is 0', () => {
      const value = MetricValue.create(85.555555, 'percentage');
      expect(value.format(0)).toBe('86 percentage');
    });
  });

  describe('validation', () => {
    it('should validate positive values', () => {
      const value = MetricValue.create(85.5, 'percentage');
      expect(value.isPositive()).toBe(true);
      expect(value.isNegative()).toBe(false);
      expect(value.isZero()).toBe(false);
    });

    it('should validate negative values', () => {
      const value = MetricValue.create(-10.5, 'celsius');
      expect(value.isPositive()).toBe(false);
      expect(value.isNegative()).toBe(true);
      expect(value.isZero()).toBe(false);
    });

    it('should validate zero values', () => {
      const value = MetricValue.create(0, 'count');
      expect(value.isPositive()).toBe(false);
      expect(value.isNegative()).toBe(false);
      expect(value.isZero()).toBe(true);
    });

    it('should validate value within range', () => {
      const value = MetricValue.create(85.5, 'percentage');
      expect(value.isBetween(80, 90)).toBe(true);
      expect(value.isBetween(90, 100)).toBe(false);
      expect(value.isBetween(85.5, 85.5)).toBe(true);
    });
  });

  describe('unit conversion helpers', () => {
    it('should identify common unit types', () => {
      expect(MetricValue.create(85.5, 'percentage').isPercentage()).toBe(true);
      expect(MetricValue.create(85.5, '%').isPercentage()).toBe(true);
      expect(MetricValue.create(85.5, 'MB').isPercentage()).toBe(false);

      expect(MetricValue.create(1024, 'bytes').isBytes()).toBe(true);
      expect(MetricValue.create(1024, 'MB').isBytes()).toBe(true);
      expect(MetricValue.create(1024, 'GB').isBytes()).toBe(true);
      expect(MetricValue.create(1024, 'percentage').isBytes()).toBe(false);

      expect(MetricValue.create(25.5, 'celsius').isTemperature()).toBe(true);
      expect(MetricValue.create(25.5, 'fahrenheit').isTemperature()).toBe(true);
      expect(MetricValue.create(25.5, 'kelvin').isTemperature()).toBe(true);
      expect(MetricValue.create(25.5, 'percentage').isTemperature()).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return formatted string representation', () => {
      const value = MetricValue.create(85.5, 'percentage');
      expect(value.toString()).toBe('85.5 percentage');
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const value = MetricValue.create(85.5, 'percentage');
      expect(() => {
        (value as any).value = 90;
      }).toThrow();
      expect(() => {
        (value as any).unit = 'MB';
      }).toThrow();
    });
  });
});