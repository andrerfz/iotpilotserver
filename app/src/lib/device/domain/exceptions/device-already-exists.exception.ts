export class DeviceAlreadyExistsException extends Error {
    constructor(id: string) {
        super(`Device with ID ${id} already exists`);
        this.name = 'DeviceAlreadyExistsException';
    }
}