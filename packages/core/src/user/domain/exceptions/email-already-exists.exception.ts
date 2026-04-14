export class EmailAlreadyExistsException extends Error {
    constructor(email: string) {
        super(`Email already exists: ${email}`);
        this.name = 'EmailAlreadyExistsException';
    }
}