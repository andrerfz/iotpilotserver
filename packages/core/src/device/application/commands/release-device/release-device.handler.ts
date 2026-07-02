import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {ReleaseDeviceCommand} from './release-device.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {DeviceNotFoundException} from '@iotpilot/core/device/domain/exceptions/device-not-found.exception';
import {createAuditService} from '@iotpilot/core/shared/infrastructure/logging/audit.service';
import {LogLevel} from '@iotpilot/core/shared/infrastructure/logging/types';

export interface ReleaseDeviceResult {
  deviceId: string;
  invalidatedKeys: number;
}

/**
 * Releases a device from its current customer so it can be re-claimed by another
 * (leasing hand-back). SUPERADMIN only. It:
 *   - invalidates the device's API keys, so the outgoing customer's key can no
 *     longer authenticate and the sensor stops reporting until re-provisioned;
 *   - resets the device to UNCLAIMED with no owner (customerId/userId = null),
 *     returning it to the pool the claim flow draws from;
 *   - leaves historical metrics and alerts untouched — they retain their
 *     original customerId and stay visible only to the customer that generated
 *     them (history survives per tenant);
 *   - writes an audit_logs record (who released which device, from which
 *     customer, when) so the ownership transfer is accountable.
 */
export class ReleaseDeviceHandler implements CommandHandler<ReleaseDeviceCommand, ReleaseDeviceResult> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(command: ReleaseDeviceCommand): Promise<ReleaseDeviceResult> {
    const tenant = command.getTenantContext();
    if (!tenant.isSuperAdmin()) {
      throw new Error('Only a SUPERADMIN can release a device');
    }

    const client = this.prisma.getClient();
    const internalId = command.deviceId.getValue();

    const device = await client.device.findFirst({
      where: {id: internalId, deletedAt: null},
      select: {id: true, deviceId: true, customerId: true, userId: true, status: true},
    });
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${internalId} not found`);
    }

    // Invalidate the device's API keys. Keys are linked to a device by naming
    // convention (`Sensor <deviceId>`); deviceId is globally unique, so this
    // targets only this device's keys and no one else's.
    const invalidated = await client.apiKey.updateMany({
      where: {name: `Sensor ${device.deviceId}`, deletedAt: null},
      data: {deletedAt: new Date()},
    });

    // Return the device to the unclaimed pool with no owner. Historical
    // metrics/alerts are deliberately NOT modified — they stay tenant-scoped by
    // their existing customerId so the outgoing customer keeps its history and
    // the next customer cannot see it.
    await client.device.update({
      where: {id: device.id},
      data: {
        status: 'UNCLAIMED',
        customerId: null,
        userId: null,
        updatedAt: new Date(),
      },
    });

    // Audit the ownership transfer. logAuditEvent never throws (it swallows and
    // logs its own errors), so a failure here cannot break the release.
    await createAuditService(this.prisma).logAuditEvent({
      timestamp: new Date(),
      level: LogLevel.INFO,
      message: `Device ${device.deviceId} released to the unclaimed pool`,
      service: 'device',
      eventType: 'DEVICE_RELEASED' as never,
      userId: tenant.getUserId().getValue(),
      customerId: device.customerId ?? undefined,
      resource: device.deviceId,
      action: 'RELEASE',
      oldValues: {customerId: device.customerId, userId: device.userId, status: device.status},
      newValues: {customerId: null, userId: null, status: 'UNCLAIMED', invalidatedKeys: invalidated.count},
      success: true,
      correlationId: tenant.getCorrelationId(),
    });

    return {deviceId: device.deviceId, invalidatedKeys: invalidated.count};
  }
}
