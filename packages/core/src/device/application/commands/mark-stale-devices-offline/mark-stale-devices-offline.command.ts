import {Command} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {TenantContext, TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';

export class MarkStaleDevicesOfflineCommand implements Command {
    static readonly type = 'MarkStaleDevicesOfflineCommand';

    private constructor(
        public readonly thresholdHours: number,
        private readonly tenantContext: TenantContext
    ) {}

    static create(thresholdHours: number = 12): MarkStaleDevicesOfflineCommand {
        return new MarkStaleDevicesOfflineCommand(
            thresholdHours,
            TenantContextImpl.createSuperAdmin()
        );
    }

    getTenantContext(): TenantContext {
        return this.tenantContext;
    }
}
