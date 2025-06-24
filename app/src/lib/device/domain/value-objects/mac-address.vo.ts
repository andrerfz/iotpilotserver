export class MACAddress {
    private constructor(private readonly value: string) {}

    get getValue(): string {
        return this.value;
    }

    static create(value: string): MACAddress {
        if (!MACAddress.isValid(value)) {
            throw new Error('Invalid MAC address format');
        }
        return new MACAddress(value);
    }

    static isValid(value: string): boolean {
        // MAC address format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
        const colonMacRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
        const hyphenMacRegex = /^([0-9A-Fa-f]{2}-){5}([0-9A-Fa-f]{2})$/;
        return colonMacRegex.test(value) || hyphenMacRegex.test(value);
    }

    equals(other: MACAddress): boolean {
        return this.value === other.value;
    }

    toString(): string {
        return this.value;
    }
}
