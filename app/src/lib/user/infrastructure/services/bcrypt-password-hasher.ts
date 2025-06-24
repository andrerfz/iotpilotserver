import {PasswordHasher} from '@/lib/user/domain/services/password-hasher';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import bcrypt from 'bcryptjs';

export class BcryptPasswordHasher implements PasswordHasher {
    private readonly saltRounds = 12;

    async hash(password: Password): Promise<string> {
        return await bcrypt.hash(password.getValue(), this.saltRounds);
    }

    async verify(password: Password, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password.getValue(), hashedPassword);
    }
}
