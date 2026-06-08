import {PasswordHasher} from '@iotpilot/core/user/domain/services/password-hasher';
import {Password} from '@iotpilot/core/user/domain/value-objects/password.vo';
import bcrypt from 'bcryptjs';

export class BcryptPasswordHasher implements PasswordHasher {
    private readonly saltRounds = 12;

    async hash(password: Password): Promise<string> {
        const plainPassword = password.getValue();
        const hashed = await bcrypt.hash(plainPassword, 12);
        
        if (process.env.NODE_ENV === 'development') {
            console.log('Password hashing completed');
        }
        
        return hashed;
    }

    async verify(password: Password, hashed: string): Promise<boolean> {
        const plainPassword = password.getValue();
        const isValid = await bcrypt.compare(plainPassword, hashed);
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`Password verification result: ${isValid ? 'valid' : 'invalid'}`);
        }
        
        return isValid;
    }
}
