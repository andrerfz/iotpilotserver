import {Password} from '../value-objects/password.vo';

export interface PasswordHasher {
    hash(password: Password): Promise<Password>;
    compare(plainPassword: Password, hashedPassword: Password): Promise<boolean>;
}