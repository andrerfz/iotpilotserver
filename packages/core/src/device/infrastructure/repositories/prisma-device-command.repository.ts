import {DeviceCommandRepository} from '../../domain/interfaces/device-command-repository.interface';
import {CommandStatus, DeviceCommand} from '../../domain/entities/device-command.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;
type PrismaDeviceCommand = {
  id: string;
  deviceId: string;
  command: string;
  arguments: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  output: string | null;
  error: string | null;
  createdAt: Date;
  executedAt: Date | null;
  updatedAt: Date;
  deletedAt: Date | null;
};
type PrismaCommandStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

/**
 * Mapper for converting between DeviceCommand domain entity and Prisma model
 */
class DeviceCommandMapper {
    toDomain(prismaCommand: PrismaDeviceCommand): DeviceCommand {
        return new DeviceCommand(
            prismaCommand.id,
            DeviceId.create(prismaCommand.deviceId),
            prismaCommand.command,
            this.mapStatus(prismaCommand.status),
            prismaCommand.output,
            prismaCommand.error,
            prismaCommand.createdAt,
            prismaCommand.executedAt,
            prismaCommand.updatedAt, // Using updatedAt as completedAt
            prismaCommand.arguments || undefined
        );
    }

    private mapStatus(status: PrismaCommandStatus): CommandStatus {
        const statusMap: Record<PrismaCommandStatus, CommandStatus> = {
            'PENDING': CommandStatus.PENDING,
            'RUNNING': CommandStatus.EXECUTING,
            'COMPLETED': CommandStatus.COMPLETED,
            'FAILED': CommandStatus.FAILED,
            'TIMEOUT': CommandStatus.TIMEOUT
        };
        return statusMap[status] || CommandStatus.PENDING;
    }

    private mapStatusToPrisma(status: CommandStatus): PrismaCommandStatus {
        const statusMap: Record<CommandStatus, PrismaCommandStatus> = {
            [CommandStatus.PENDING]: 'PENDING',
            [CommandStatus.EXECUTING]: 'RUNNING',
            [CommandStatus.RUNNING]: 'RUNNING',
            [CommandStatus.COMPLETED]: 'COMPLETED',
            [CommandStatus.FAILED]: 'FAILED',
            [CommandStatus.TIMEOUT]: 'TIMEOUT'
        };
        return statusMap[status];
    }

    toPersistence(command: DeviceCommand): any {
        return {
            id: command.id,
            deviceId: command.deviceId.getValue(),
            command: command.command,
            arguments: command.arguments || null,
            status: this.mapStatusToPrisma(command.status),
            output: command.output,
            error: command.error,
            executedAt: command.executedAt,
            createdAt: command.createdAt
        };
    }
}

/**
 * Prisma implementation of the DeviceCommandRepository interface
 */
export class PrismaDeviceCommandRepository implements DeviceCommandRepository {
    private readonly mapper: DeviceCommandMapper;

    constructor(private readonly prisma: PrismaService) {
        this.mapper = new DeviceCommandMapper();
    }

    async findById(id: string): Promise<DeviceCommand | null> {
        const command = await this.prisma.getClient().deviceCommand.findUnique({
            where: { 
                id,
                deletedAt: null 
            }
        });

        return command ? this.mapper.toDomain(command) : null;
    }

    async findByDeviceId(deviceId: DeviceId): Promise<DeviceCommand[]> {
        const commands = await this.prisma.getClient().deviceCommand.findMany({
            where: {
                deviceId: deviceId.getValue(),
                deletedAt: null
            },
            orderBy: { createdAt: 'desc' }
        });

        return commands.map((cmd: PrismaDeviceCommand) => this.mapper.toDomain(cmd));
    }

    async findPendingByDeviceId(deviceId: DeviceId): Promise<DeviceCommand[]> {
        const commands = await this.prisma.getClient().deviceCommand.findMany({
            where: {
                deviceId: deviceId.getValue(),
                status: 'PENDING',
                deletedAt: null
            },
            orderBy: { createdAt: 'asc' }
        });

        return commands.map((cmd: PrismaDeviceCommand) => this.mapper.toDomain(cmd));
    }

    async save(command: DeviceCommand): Promise<void> {
        const data = this.mapper.toPersistence(command);

        await this.prisma.getClient().deviceCommand.create({
            data: {
                id: data.id,
                deviceId: data.deviceId,
                command: data.command,
                arguments: data.arguments,
                status: data.status,
                createdAt: data.createdAt
            }
        });
    }

    async update(command: DeviceCommand): Promise<void> {
        const data = this.mapper.toPersistence(command);

        await this.prisma.getClient().deviceCommand.update({
            where: { id: data.id },
            data: {
                status: data.status,
                output: data.output,
                error: data.error,
                executedAt: data.executedAt
            }
        });
    }

    async delete(id: string): Promise<void> {
        // Soft delete
        await this.prisma.getClient().deviceCommand.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }

    async countPendingByDeviceId(deviceId: DeviceId): Promise<number> {
        return this.prisma.getClient().deviceCommand.count({
            where: {
                deviceId: deviceId.getValue(),
                status: 'PENDING',
                deletedAt: null
            }
        });
    }

    async findRecentByDeviceId(
        deviceId: DeviceId,
        limit: number = 10,
        offset: number = 0
    ): Promise<DeviceCommand[]> {
        const commands = await this.prisma.getClient().deviceCommand.findMany({
            where: {
                deviceId: deviceId.getValue(),
                deletedAt: null
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });

        return commands.map((cmd: PrismaDeviceCommand) => this.mapper.toDomain(cmd));
    }
}


