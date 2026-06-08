import { Command } from '@iotpilot/core/shared/application/interfaces/command.interface';

export class VerifyTwoFactorCommand implements Command {
    static readonly type = 'VerifyTwoFactorCommand';

    private constructor(
        public readonly userId: string,
        public readonly code: string,
        public readonly customerId: string | undefined,
    ) {}

    static create(userId: string, code: string, customerId?: string) {
        return new VerifyTwoFactorCommand(userId, code, customerId);
    }
}
