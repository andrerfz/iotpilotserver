export class SSHConnectionFailedException extends Error {
    constructor(deviceId: string, reason: string) {
        super(`SSH connection to device ${deviceId} failed: ${reason}`);
        this.name = 'SSHConnectionFailedException';
    }
}