import {ValueObject} from '@iotpilot/core/shared/domain/interfaces/value-object.interface';
import {CryptoService} from '@iotpilot/core/shared/domain/interfaces/crypto-service.interface';

/**
 * Value object representing an API Key value (the actual key string)
 * Format: iot_<64 hex characters>
 */
export class ApiKeyValue extends ValueObject {
    private static readonly PREFIX = 'iot_';
    private static readonly KEY_LENGTH = 64; // 32 bytes = 64 hex characters

    constructor(private readonly value: string) {
        super();
        this.validate(value);
    }

    getValue(): string {
        return this.value;
    }

    /**
     * Returns a masked version of the key for display purposes
     * Shows only the first 8 and last 4 characters
     */
    getMaskedValue(): string {
        if (this.value.length <= 16) {
            return '***';
        }
        const prefix = this.value.substring(0, 8);
        const suffix = this.value.substring(this.value.length - 4);
        return `${prefix}...${suffix}`;
    }

    equals(other: ValueObject): boolean {
        return other instanceof ApiKeyValue && this.value === other.value;
    }

    toString(): string {
        return this.getMaskedValue();
    }

    private validate(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('API Key value cannot be empty');
        }
        if (!value.startsWith(ApiKeyValue.PREFIX)) {
            throw new Error(`API Key must start with '${ApiKeyValue.PREFIX}'`);
        }
        const keyPart = value.substring(ApiKeyValue.PREFIX.length);
        if (!/^[0-9a-f]+$/i.test(keyPart)) {
            throw new Error('API Key must contain only hexadecimal characters after prefix');
        }
        if (keyPart.length !== ApiKeyValue.KEY_LENGTH) {
            throw new Error(`API Key must be ${ApiKeyValue.KEY_LENGTH} characters after prefix`);
        }
    }

    /**
     * Generate a new secure API key value
     * @param cryptoService The crypto service to use for generation
     */
    static generate(cryptoService: CryptoService): ApiKeyValue {
        const randomBytes = cryptoService.randomBytes(32);
        const hexString = randomBytes.toString('hex');
        return new ApiKeyValue(`${ApiKeyValue.PREFIX}${hexString}`);
    }

    static fromString(value: string): ApiKeyValue {
        return new ApiKeyValue(value);
    }

    /**
     * Check if a string looks like a valid API key format
     */
    static isValidFormat(value: string): boolean {
        if (!value || !value.startsWith(ApiKeyValue.PREFIX)) {
            return false;
        }
        const keyPart = value.substring(ApiKeyValue.PREFIX.length);
        return /^[0-9a-f]+$/i.test(keyPart) && keyPart.length === ApiKeyValue.KEY_LENGTH;
    }
}


