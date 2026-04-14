import {Command} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext, TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';

export interface UpdateUserProfileData {
    username?: string;
    displayName?: string;
    preferences?: Record<string, any>;
}

export class UpdateUserProfileCommand extends TenantAwareCommand implements Command {
    private constructor(
        public readonly userId: string,
        public readonly profileData: UpdateUserProfileData,
        public readonly customerId: string | undefined,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(
        userId: string,
        profileData: UpdateUserProfileData,
        customerId?: string,
        tenantContext?: TenantContext
    ): UpdateUserProfileCommand {
        const context = tenantContext || TenantContextImpl.createSuperAdmin(UserId.fromString('system'));
        return new UpdateUserProfileCommand(userId, profileData, customerId, context);
    }
}