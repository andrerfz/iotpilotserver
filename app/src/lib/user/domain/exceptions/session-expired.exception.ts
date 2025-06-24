export class SessionExpiredException extends Error {
    constructor(message: string = 'Session has expired or is invalid') {
        super(message);
        this.name = 'SessionExpiredException';
    }
}