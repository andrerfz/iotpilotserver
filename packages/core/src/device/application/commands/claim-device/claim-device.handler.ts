import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {ClaimDeviceCommand} from './claim-device.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import * as crypto from 'crypto';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export interface ClaimDeviceResult {
    deviceId: string;
    claimingToken: string;      // One-time token, 15min TTL
    expiresAt: string;          // ISO string
    instructions: string;
}

const TOKEN_TTL_MINUTES = 15;

/**
 * Generates a human-readable claiming token in XXXX-YYYY format.
 * 36^8 combinations — secure enough for a 15min single-use token.
 */
function generateClaimingToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let part1 = '';
    let part2 = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 4; i++) {
        part1 += chars[bytes[i] % chars.length];
        part2 += chars[bytes[i + 4] % chars.length];
    }
    return `${part1}-${part2}`;
}

export class ClaimDeviceHandler implements CommandHandler<ClaimDeviceCommand, ClaimDeviceResult> {
    private readonly prismaService: PrismaService;

    constructor(prismaService: PrismaService) {
        this.prismaService = prismaService;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    async handle(command: ClaimDeviceCommand): Promise<ClaimDeviceResult> {
        const { data, userId } = command;
        const tenantContext = command.getTenantContext();
        const customerId = tenantContext.getCustomerId();

        if (!customerId) {
            throw new Error('Customer ID is required to claim a device');
        }

        // Find device by deviceId
        const device = await this.prisma.device.findFirst({
            where: { deviceId: data.deviceId, deletedAt: null }
        });

        if (!device) {
            throw new Error(`Device not found: ${data.deviceId}`);
        }

        // Allow re-claiming if PENDING_SETUP with an expired, unused token (customer didn't finish setup in time)
        if (device.status === 'PENDING_SETUP' as any) {
            const meta = (device.metadata as Record<string, any>) || {};
            const tokenExpired = meta.claimingTokenExpiresAt && new Date(meta.claimingTokenExpiresAt) < new Date();
            const tokenUnused = !meta.claimingTokenUsed;
            if (!tokenExpired || !tokenUnused) {
                throw new Error(`Device ${data.deviceId} is already claimed or not available`);
            }
            // Expired unused token — fall through and issue a fresh one
        } else if (device.status !== 'UNCLAIMED' as any) {
            throw new Error(`Device ${data.deviceId} is already claimed or not available`);
        }

        // Generate one-time claiming token
        const claimingToken = generateClaimingToken();
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

        // Store token + associate with customer in metadata
        const currentMetadata = (device.metadata as Record<string, any>) || {};
        await this.prisma.device.update({
            where: { id: device.id },
            data: {
                status: 'PENDING_SETUP' as any,
                customerId: customerId.getValue(),
                userId: userId,
                name: data.name || device.name || `Sensor ${data.deviceId}`,
                metadata: {
                    ...currentMetadata,
                    claimingToken,
                    claimingTokenExpiresAt: expiresAt.toISOString(),
                    claimingTokenUsed: false,
                    claimedBy: userId,
                    claimedAt: new Date().toISOString()
                },
                updatedAt: new Date()
            }
        });

        return {
            deviceId: data.deviceId,
            claimingToken,
            expiresAt: expiresAt.toISOString(),
            instructions: `Power on your device, connect to the "IotPilot-Setup-XXXX" WiFi hotspot, and enter this token: ${claimingToken}`
        };
    }
}
