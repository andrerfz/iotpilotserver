import {Command} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext, TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';

export class ApproveUserCommand extends TenantAwareCommand implements Command {
    private constructor(
        public readonly userId: string,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(userId: string, tenantContext?: TenantContext): ApproveUserCommand {
        const context = tenantContext || TenantContextImpl.createSuperAdmin(UserId.fromString('system'));
        return new ApproveUserCommand(userId, context);
    }
}

