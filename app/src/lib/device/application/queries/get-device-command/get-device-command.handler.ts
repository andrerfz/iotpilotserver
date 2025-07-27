import {QueryHandler} from '@/lib/shared/application/interfaces/query.interface';
import {GetDeviceCommandQuery} from './get-device-command.query';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export interface DeviceCommandResult {
    id: string;
    deviceId: string;
    command: string;
    arguments: string | null;
    status: string;
    output: string | null;
    error: string | null;
    exitCode: number | null;
    executedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Handler for getting device command details
 */
export class GetDeviceCommandHandler implements QueryHandler<GetDeviceCommandQuery, DeviceCommandResult | null> {
    private readonly prismaService: PrismaService;

    constructor(prismaService: PrismaService) {
        this.prismaService = prismaService;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    async handle(query: GetDeviceCommandQuery): Promise<DeviceCommandResult | null> {
        const { deviceId, commandId } = query;
        const tenantContext = query.getTenantContext();

        // Check if device exists and belongs to the tenant
        const device = await this.prisma.device.findFirst({
            where: {
                id: deviceId,
                ...(tenantContext.isSuperAdminUser() ? {} : {
                    customerId: tenantContext.getCustomerId()?.getValue()
                })
            }
        });

        if (!device) {
            return null;
        }

        // Fetch command details
        const command = await this.prisma.deviceCommand.findFirst({
            where: {
                id: commandId,
                deviceId: deviceId,
                deletedAt: null
            }
        });

        if (!command) {
            return null;
        }

        return {
            id: command.id,
            deviceId: command.deviceId,
            command: command.command,
            arguments: command.arguments,
            status: command.status,
            output: command.output,
            error: command.error,
            exitCode: command.exitCode,
            executedAt: command.executedAt,
            createdAt: command.createdAt,
            updatedAt: command.updatedAt
        };
    }
}

