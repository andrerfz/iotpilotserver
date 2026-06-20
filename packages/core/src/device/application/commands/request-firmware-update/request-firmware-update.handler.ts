import { CommandHandler } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { RequestFirmwareUpdateCommand } from './request-firmware-update.command';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export interface RequestFirmwareUpdateResult {
  deviceId: string;
  targetFirmwareVersion: string;
}

export class RequestFirmwareUpdateHandler
  implements CommandHandler<RequestFirmwareUpdateCommand, RequestFirmwareUpdateResult>
{
  constructor(private readonly prisma: PrismaClient) {}

  async handle(command: RequestFirmwareUpdateCommand): Promise<RequestFirmwareUpdateResult> {
    const { deviceId, targetVersion } = command;
    const tenantContext = command.getTenantContext();

    const where: Record<string, unknown> = { id: deviceId, deletedAt: null };
    if (!tenantContext.isSuperAdminUser()) {
      where.customerId = tenantContext.getCustomerId()?.getValue();
    }

    const device = await this.prisma.device.findFirst({ where, select: { id: true } });
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: { targetFirmwareVersion: targetVersion },
    });

    return { deviceId, targetFirmwareVersion: targetVersion };
  }
}
