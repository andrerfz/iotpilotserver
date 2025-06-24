export class DeviceAccessDeniedException extends Error {
    constructor(deviceId: string, userId: string) {
        super(`Access denied for user ${userId} to device ${deviceId}`);
        this.name = 'DeviceAccessDeniedException';
    }
}