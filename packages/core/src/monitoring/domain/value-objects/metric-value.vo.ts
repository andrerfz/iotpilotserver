import {ValueObject} from '@iotpilot/core/shared/domain/interfaces/value-object.interface';

export class MetricValue extends ValueObject {
    constructor(
        private readonly _value: number,
        private readonly _unit: string
    ) {
        super();
        if (_value === undefined || _value === null) {
            throw new Error('Metric value cannot be empty');
        }
        if (Number.isNaN(_value)) {
            throw new Error('Metric value cannot be NaN');
        }
        if (!Number.isFinite(_value)) {
            throw new Error('Metric value cannot be infinite');
        }
        if (!_unit || _unit === null) {
            throw new Error('Metric unit cannot be empty');
        }
    }

    get value(): number {
        return this._value;
    }

    get unit(): string {
        return this._unit;
    }

    getValue(): number {
        return this._value;
    }

    getUnit(): string {
        return this._unit;
    }

    equals(other: ValueObject): boolean {
        if (!(other instanceof MetricValue)) {
            return false;
        }
        
        const otherMetric = other as MetricValue;
        // Handle floating point precision issues
        const valueEqual = Math.abs(this._value - otherMetric.value) < Number.EPSILON;
        const unitEqual = this._unit === otherMetric.unit;
        
        return valueEqual && unitEqual;
    }

    static create(value: number, unit: string): MetricValue {
        return new MetricValue(value, unit);
    }

    // Comparison operations
    isLessThan(other: MetricValue): boolean {
        this.validateSameUnit(other);
        return this._value < other.value;
    }

    isGreaterThan(other: MetricValue): boolean {
        this.validateSameUnit(other);
        return this._value > other.value;
    }

    isLessThanOrEqual(other: MetricValue): boolean {
        this.validateSameUnit(other);
        return this._value <= other.value;
    }

    isGreaterThanOrEqual(other: MetricValue): boolean {
        this.validateSameUnit(other);
        return this._value >= other.value;
    }

    // Arithmetic operations
    add(other: MetricValue): MetricValue {
        this.validateSameUnit(other, 'arithmetic');
        return new MetricValue(this._value + other.value, this._unit);
    }

    subtract(other: MetricValue): MetricValue {
        this.validateSameUnit(other, 'arithmetic');
        return new MetricValue(this._value - other.value, this._unit);
    }

    multiplyBy(scalar: number): MetricValue {
        return new MetricValue(this._value * scalar, this._unit);
    }

    divideBy(scalar: number): MetricValue {
        if (scalar === 0) {
            throw new Error('Cannot divide by zero');
        }
        return new MetricValue(this._value / scalar, this._unit);
    }

    // Validation methods
    isPositive(): boolean {
        return this._value > 0;
    }

    isNegative(): boolean {
        return this._value < 0;
    }

    isZero(): boolean {
        return this._value === 0;
    }

    isBetween(min: number, max: number): boolean {
        return this._value >= min && this._value <= max;
    }

    // Formatting
    format(precision?: number): string {
        if (precision !== undefined) {
            return `${this._value.toFixed(precision)} ${this._unit}`;
        }
        // Default formatting - remove unnecessary decimals for integers
        const formatted = this._value % 1 === 0 ? this._value.toString() : this._value.toString();
        return `${formatted} ${this._unit}`;
    }

    // Unit type helpers
    isPercentage(): boolean {
        return this._unit === 'percentage' || this._unit === '%';
    }

    isBytes(): boolean {
        const byteUnits = ['bytes', 'B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        return byteUnits.includes(this._unit);
    }

    isTemperature(): boolean {
        const tempUnits = ['celsius', 'fahrenheit', 'kelvin', 'C', 'F', 'K'];
        return tempUnits.includes(this._unit);
    }

    // Private helper methods
    private validateSameUnit(other: MetricValue, operation: string = 'compare'): void {
        if (this._unit !== other.unit) {
            const errorMessage = operation === 'arithmetic' 
                ? `Cannot perform arithmetic with different units: ${this._unit} vs ${other.unit}`
                : `Cannot compare metric values with different units: ${this._unit} vs ${other.unit}`;
            throw new Error(errorMessage);
        }
    }

    toString(): string {
        return `${this._value} ${this._unit}`;
    }
}