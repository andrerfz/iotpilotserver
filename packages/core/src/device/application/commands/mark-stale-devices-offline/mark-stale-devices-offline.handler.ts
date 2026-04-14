import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {MarkStaleDevicesOfflineCommand} from './mark-stale-devices-offline.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {DeviceModelEnum, isSensorDevice} from '@iotpilot/core/device/domain/value-objects/device-type.vo';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export interface MarkStaleDevicesOfflineResult {
    markedOffline: number;
    thresholdHours: number;
}

export class MarkStaleDevicesOfflineHandler
    implements CommandHandler<MarkStaleDevicesOfflineCommand, MarkStaleDevicesOfflineResult>
{
    private readonly prismaService: PrismaService;

    constructor(prismaService: PrismaService) {
        this.prismaService = prismaService;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    async handle(command: MarkStaleDevicesOfflineCommand): Promise<MarkStaleDevicesOfflineResult> {
        const threshold = new Date(
            Date.now() - command.thresholdHours * 60 * 60 * 1000
        );

        const result = await this.prisma.device.updateMany({
            where: {
                status: 'ONLINE',
                deviceType: { in: Object.values(DeviceModelEnum).filter(isSensorDevice) as any[] },
                lastSeen: { lt: threshold },
                deletedAt: null,
            },
            data: {
                status: 'OFFLINE',
                updatedAt: new Date(),
            },
        });

        return {
            markedOffline: result.count,
            thresholdHours: command.thresholdHours,
        };
    }
}
