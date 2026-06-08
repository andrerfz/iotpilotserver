import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

/**
 * Command to create a new API key
 * Extends TenantAwareCommand for proper tenant isolation
 */
export class CreateApiKeyCommand extends TenantAwareCommand {
    /** Static type identifier that survives minification */
    static readonly type = 'CreateApiKeyCommand';

    constructor(
        public readonly userId: string,
        public readonly customerId: string,
        public readonly name: string,
        tenantContext: TenantContext,
        public readonly expiresAt?: Date
    ) {
        super(tenantContext);
    }

    static create(
        userId: string,
        customerId: string,
        name: string,
        tenantContext: TenantContext,
        expiresAt?: Date
    ): CreateApiKeyCommand {
        return new CreateApiKeyCommand(userId, customerId, name, tenantContext, expiresAt);
    }
}