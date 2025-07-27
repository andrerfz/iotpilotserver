import {Command} from '@/lib/shared/application/interfaces/command.interface';
import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class RefreshSessionCommand extends TenantAwareCommand implements Command {
    /** Static type identifier that survives minification */
    static readonly type = 'RefreshSessionCommand';

    private constructor(
        public readonly refreshToken: string,
        public readonly tenantCustomerId?: string,
        tenantContext?: TenantContext
    ) {
        super(tenantContext!);
    }

    static create(
        refreshToken: string,
        tenantCustomerId?: string,
        tenantContext?: TenantContext
    ): RefreshSessionCommand {
        return new RefreshSessionCommand(
            refreshToken,
            tenantCustomerId,
            tenantContext
        );
    }
}