import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {MarkStaleDevicesOfflineCommand} from './mark-stale-devices-offline.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {DeviceModelEnum, isSensorDevice} from '@iotpilot/core/device/domain/value-objects/device-type.vo';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {DeviceDisconnectedEvent} from '@iotpilot/core/device/domain/events/device-disconnected.event';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export interface MarkStaleDevicesOfflineResult {
    markedOffline: number;
    thresholdHours: number;
}

export class MarkStaleDevicesOfflineHandler
    implements CommandHandler<MarkStaleDevicesOfflineCommand, MarkStaleDevicesOfflineResult>
{
    private readonly prismaService: PrismaService;
    private readonly eventBus: EventBus;
    private readonly logger = StructuredLogger.forService('mark-stale-devices-offline');

    constructor(prismaService: PrismaService, eventBus: EventBus) {
        this.prismaService = prismaService;
        this.eventBus = eventBus;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    async handle(command: MarkStaleDevicesOfflineCommand): Promise<MarkStaleDevicesOfflineResult> {
        const threshold = new Date(
            Date.now() - command.thresholdHours * 60 * 60 * 1000
        );

        const staleDevices = await this.prisma.device.findMany({
            where: {
                status: 'ONLINE',
                deviceType: { in: Object.values(DeviceModelEnum).filter(isSensorDevice) as any[] },
                lastSeen: { lt: threshold },
                deletedAt: null,
            },
            select: { id: true, name: true, hostname: true, deviceId: true, customerId: true },
        });

        if (staleDevices.length === 0) {
            return { markedOffline: 0, thresholdHours: command.thresholdHours };
        }

        await this.prisma.device.updateMany({
            where: { id: { in: staleDevices.map((d) => d.id) } },
            data: { status: 'OFFLINE', updatedAt: new Date() },
        });

        for (const device of staleDevices) {
            if (!device.customerId) continue;
            try {
                await this.eventBus.publish(new DeviceDisconnectedEvent(
                    DeviceId.create(device.id),
                    DeviceName.create(device.name ?? device.hostname ?? device.deviceId),
                    new Date(),
                    'heartbeat_timeout',
                    false,
                    CustomerId.create(device.customerId),
                ));
            } catch (error) {
                // Best-effort: a notification failure must not roll back the offline mark.
                this.logger.error('Failed to publish DeviceDisconnectedEvent', {
                    deviceId: device.id,
                    error: (error as Error).message,
                });
            }
        }

        return {
            markedOffline: staleDevices.length,
            thresholdHours: command.thresholdHours,
        };
    }
}
