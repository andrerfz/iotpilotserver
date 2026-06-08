import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {ProvisionDeviceCommand} from './provision-device.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import * as crypto from 'crypto';
import {createId} from '@paralleldrive/cuid2';
import {DeviceModelEnum} from '@iotpilot/core/device/domain/value-objects/device-type.vo';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export interface ProvisionDeviceResult {
    apiKey: string;
    webhookUrl: string;
    config: {
        reportingInterval: number;  // seconds
        deepSleepEnabled: boolean;
    };
}

function generateSensorApiKey(): string {
    const random = crypto.randomBytes(24).toString('base64url');
    return `iotp_sensor_${random}`;
}

export class ProvisionDeviceHandler implements CommandHandler<ProvisionDeviceCommand, ProvisionDeviceResult> {
    private readonly prismaService: PrismaService;

    constructor(prismaService: PrismaService) {
        this.prismaService = prismaService;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    async handle(command: ProvisionDeviceCommand): Promise<ProvisionDeviceResult> {
        const { data } = command;

        // Find device
        const device = await this.prisma.device.findFirst({
            where: { deviceId: data.deviceId, deletedAt: null }
        });

        if (!device) {
            throw new Error(`Device not found: ${data.deviceId}`);
        }

        if (device.status !== 'PENDING_SETUP' as any) {
            throw new Error(`Device ${data.deviceId} is not in PENDING_SETUP state`);
        }

        const metadata = (device.metadata as Record<string, any>) || {};

        // Validate claiming token
        if (!metadata.claimingToken) {
            throw new Error('No claiming token found for this device');
        }

        if (metadata.claimingToken !== data.claimingToken) {
            throw new Error('Invalid claiming token');
        }

        if (metadata.claimingTokenUsed === true) {
            throw new Error('Claiming token has already been used');
        }

        const expiresAt = new Date(metadata.claimingTokenExpiresAt);
        if (new Date() > expiresAt) {
            throw new Error('Claiming token has expired');
        }

        if (!device.userId || !device.customerId) {
            throw new Error('Device must be claimed before activation (no user or customer assigned)');
        }

        const deviceUserId = device.userId;
        const deviceCustomerId = device.customerId;

        // Generate permanent API key for this device
        const apiKey = generateSensorApiKey();
        const domain = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
            (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : 'https://iotpilotserver.test');
        const baseUrl = domain;
        const webhookUrl = `${baseUrl}/api/webhook/temperature`;

        // Store API key in api_keys table
        await this.prisma.apiKey.create({
            data: {
                id: createId(),
                userId: deviceUserId,
                customerId: deviceCustomerId,
                name: `Sensor ${data.deviceId}`,
                key: apiKey
            }
        });

        // Update device: mark as OFFLINE (ready for first heartbeat), store API key ref, mark token used
        await this.prisma.device.update({
            where: { id: device.id },
            data: {
                status: 'OFFLINE' as any,
                name: `Sensor ${data.deviceId}`,
                deviceType: (
                    data.deviceModel === 'LILYGO-T-OI-PLUS-C3'      ? DeviceModelEnum.ESP32C3_SENSOR :
                    data.deviceModel === 'HELTEC-WIFI-LORA-32-V3'    ? DeviceModelEnum.HELTEC_LORA32V3_SENSOR :
                    DeviceModelEnum.ESP8266_SENSOR
                ) as any,
                macAddress: data.macAddress || device.macAddress,
                ipAddress: data.ipAddress || device.ipAddress,
                agentVersion: data.firmwareVersion,
                deviceModel: data.deviceModel || device.deviceModel,
                metadata: {
                    ...metadata,
                    claimingTokenUsed: true,
                },
                capabilities: {
                    ...metadata,
                    claimingTokenUsed: true,
                    provisionedAt: new Date().toISOString(),
                    apiKeyCreated: true,
                    reportingInterval: 300,
                    deepSleepEnabled: true
                },
                updatedAt: new Date()
            }
        });

        return {
            apiKey,
            webhookUrl,
            config: {
                reportingInterval: 300,
                deepSleepEnabled: true
            }
        };
    }
}
