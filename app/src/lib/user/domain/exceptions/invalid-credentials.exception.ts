export class InvalidCredentialsException extends Error {
    constructor(message: string = 'Invalid email or password') {
        super(message);
        this.name = 'InvalidCredentialsException';
    }
}