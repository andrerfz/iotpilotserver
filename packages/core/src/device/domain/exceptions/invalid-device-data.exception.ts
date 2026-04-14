export class InvalidDeviceDataException extends Error {
    constructor(message: string) {
        super(`Invalid device data: ${message}`);
        this.name = 'InvalidDeviceDataException';
    }
}