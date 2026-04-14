import { Command } from '@iotpilot/core/shared/application/interfaces/command.interface';

export class SendVerificationCodeCommand implements Command {
    static readonly type = 'SendVerificationCodeCommand';

    private constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly codeType: 'TWO_FACTOR' | 'PASSWORD_RESET' | 'EMAIL_VERIFY',
    ) {}

    static create(userId: string, email: string, codeType: 'TWO_FACTOR' | 'PASSWORD_RESET' | 'EMAIL_VERIFY') {
        return new SendVerificationCodeCommand(userId, email, codeType);
    }
}
