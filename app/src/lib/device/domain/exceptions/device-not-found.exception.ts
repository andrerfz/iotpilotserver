export class DeviceNotFoundException extends Error {
    constructor(id: string) {
        super(`Device with ID ${id} not found`);
        this.name = 'DeviceNotFoundException';
    }
}