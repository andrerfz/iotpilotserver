export class IpAddress {
    constructor(private readonly _value: string) {
        if (!_value) {
            throw new Error('IP address cannot be empty');
        }
        
        // Simple IPv4 validation
        const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const match = _value.match(ipv4Regex);
        
        if (!match) {
            throw new Error('Invalid IP address format');
        }
        
        // Validate each octet
        for (let i = 1; i <= 4; i++) {
            const octet = parseInt(match[i], 10);
            if (octet < 0 || octet > 255) {
                throw new Error('IP address octets must be between 0 and 255');
            }
        }
    }

    get value(): string {
        return this._value;
    }

    equals(ipAddress: IpAddress): boolean {
        return this._value === ipAddress.value;
    }

    static create(ipAddress: string): IpAddress {
        return new IpAddress(ipAddress);
    }
}