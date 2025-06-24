export class Port {
    private constructor(private readonly value: number) {}

    get getValue(): number {
        return this.value;
    }

    static create(value: number): Port {
        if (!Port.isValid(value)) {
            throw new Error(`Invalid port number: ${value}`);
        }
        return new Port(value);
    }

    static isValid(value: number): boolean {
        // Port numbers range from 1 to 65535
        return Number.isInteger(value) && value >= 1 && value <= 65535;
    }

    equals(other: Port): boolean {
        return this.value === other.value;
    }

    toString(): string {
        return this.value.toString();
    }
}