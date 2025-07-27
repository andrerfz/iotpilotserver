import {Command} from '@/lib/shared/application/interfaces/command.interface';
import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext, TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';

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