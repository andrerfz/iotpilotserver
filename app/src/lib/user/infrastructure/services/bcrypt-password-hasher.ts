import * as bcrypt from 'bcryptjs';
import {PasswordHasher} from '@/lib/user/domain/services/password-hasher';
import {Password} from '@/lib/user/domain/value-objects/password.vo';

export class BcryptPasswordHasher implements PasswordHasher {
    constructor(private readonly saltRounds: number = 10) {}

    async hash(password: Password): Promise<Password> {
        if (password.isAlreadyHashed()) {
            return password;
        }

        const hashedValue = await bcrypt.hash(password.getValue(), this.saltRounds);
        return Password.createHashed(hashedValue);
    }

    async compare(plainPassword: Password, hashedPassword: Password): Promise<boolean> {
        return bcrypt.compare(plainPassword.getValue(), hashedPassword.getValue());
    }
}
