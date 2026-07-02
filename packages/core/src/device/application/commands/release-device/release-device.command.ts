import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';

/**
 * Command to release a device from its current customer (SUPERADMIN only).
 *
 * Leasing lifecycle: when a customer stops using a leased device, a SUPERADMIN
 * releases it — the device returns to the UNCLAIMED pool with no owner and its
 * API keys are invalidated — so the next customer can claim it fresh. The
 * outgoing customer's historical metrics/alerts are intentionally left
 * untouched: they keep their original customerId and stay scoped to that
 * tenant, so history survives per customer.
 */
export class ReleaseDeviceCommand extends TenantAwareCommand {
  /** Static type identifier that survives minification */
  static readonly type = 'ReleaseDeviceCommand';

  private constructor(
    tenantContext: TenantContext,
    public readonly deviceId: DeviceId,
  ) {
    super(tenantContext);
  }

  /**
   * @param deviceId Internal device id to release
   * @param tenantContext SUPERADMIN tenant context
   */
  static create(deviceId: string, tenantContext: TenantContext): ReleaseDeviceCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }
    return new ReleaseDeviceCommand(tenantContext, DeviceId.create(deviceId));
  }
}
