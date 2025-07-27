import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class ExecuteSshCommandCommand extends TenantAwareCommand {
    /** Static type identifier that survives minification */
    static readonly type = 'ExecuteSshCommandCommand';

    constructor(
        public readonly deviceId: string,
        public readonly command: string,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }
}

// Alias for compatibility
export const ExecuteSSHCommand = ExecuteSshCommandCommand;