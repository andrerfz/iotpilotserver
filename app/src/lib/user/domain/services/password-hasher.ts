import {Password} from '../value-objects/password.vo';

export interface PasswordHasher {
    hash(password: Password): Promise<string>;
    verify(password: Password, hashedPassword: string): Promise<boolean>;
}
