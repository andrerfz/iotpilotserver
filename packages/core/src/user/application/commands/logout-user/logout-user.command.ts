import {Command} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export class LogoutUserCommand extends TenantAwareCommand implements Command {
    /** Static type identifier that survives minification */
    static readonly type = 'LogoutUserCommand';

    private constructor(
        public readonly userId: UserId,
        public readonly sessionToken?: string,
        public readonly tenantCustomerId?: string,
        tenantContext?: TenantContext
    ) {
        super(tenantContext!);
    }

    static create(
        userId: string,
        sessionToken?: string,
        tenantCustomerId?: string,
        tenantContext?: TenantContext
    ): LogoutUserCommand {
        return new LogoutUserCommand(
            UserId.create(userId),
            sessionToken,
            tenantCustomerId,
            tenantContext
        );
    }
}