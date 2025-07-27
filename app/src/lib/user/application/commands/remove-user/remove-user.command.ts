import {Command} from '@/lib/shared/application/interfaces/command.interface';
import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext, TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';

export class RemoveUserCommand extends TenantAwareCommand implements Command {
    private constructor(
        public readonly userId: string,
        public readonly customerId: string | undefined,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(
        userId: string,
        customerId?: string,
        tenantContext?: TenantContext
    ): RemoveUserCommand {
        const context = tenantContext || TenantContextImpl.createSuperAdmin(UserId.fromString('system'));
        return new RemoveUserCommand(userId, customerId, context);
    }
}