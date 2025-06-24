import { PrismaClient } from '@prisma/client';
import { Device } from '@/lib/device/domain/entities/device.entity';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
import { DeviceRepository } from '@/lib/device/domain/interfaces/device-repository.interface';
import { DeviceMapper, DevicePersistence } from '@/lib/device/infrastructure/mappers/device.mapper';

export class PrismaDeviceRepository implements DeviceRepository {
    constructor(private prisma: PrismaClient) {}

    async findById(id: DeviceId): Promise<Device | null> {
        const deviceData = await this.prisma.device.findUnique({
            where: { id: id.value }
        });

        return deviceData ? DeviceMapper.toDomain(deviceData as unknown as DevicePersistence) : null;
    }

    async findByName(name: string): Promise<Device | null> {
        const deviceData = await this.prisma.device.findFirst({
            where: { hostname: name }
        });

        return deviceData ? DeviceMapper.toDomain(deviceData as unknown as DevicePersistence) : null;
    }

    async findByIpAddress(ipAddress: string): Promise<Device | null> {
        const deviceData = await this.prisma.device.findFirst({
            where: { ipAddress }
        });

        return deviceData ? DeviceMapper.toDomain(deviceData as unknown as DevicePersistence) : null;
    }

    async findAll(): Promise<Device[]> {
        const devicesData = await this.prisma.device.findMany();

        return devicesData.map(device => 
            DeviceMapper.toDomain(device as unknown as DevicePersistence)
        );
    }

    async findActive(): Promise<Device[]> {
        const devicesData = await this.prisma.device.findMany({
            where: { status: 'ONLINE' }
        });

        return devicesData.map(device => 
            DeviceMapper.toDomain(device as unknown as DevicePersistence)
        );
    }

    async findInactive(): Promise<Device[]> {
        const devicesData = await this.prisma.device.findMany({
            where: { status: 'OFFLINE' }
        });

        return devicesData.map(device => 
            DeviceMapper.toDomain(device as unknown as DevicePersistence)
        );
    }

    async save(device: Device): Promise<void> {
        const deviceData = DeviceMapper.toPersistence(device);

        // For update operations, we only need to update the fields that are in DevicePersistence
        const updateData = {
            hostname: deviceData.name, // Map name to hostname
            ipAddress: deviceData.ipAddress,
            status: deviceData.status as any, // Cast to any to bypass type checking
            updatedAt: deviceData.updatedAt
        };

        // Check if the device already exists
        const existingDevice = await this.prisma.device.findUnique({
            where: { id: deviceData.id }
        });

        if (existingDevice) {
            // Update existing device
            await this.prisma.device.update({
                where: { id: deviceData.id },
                data: updateData
            });

            return;
        }

        // To create operations, we need to provide all required fields
        // This is a simplified version and might need to be adjusted based on your actual requirements
        await this.prisma.device.create({
            data: {
                id: deviceData.id,
                deviceId: `device-${deviceData.id}`, // Generate a deviceId
                hostname: deviceData.name,
                deviceType: 'GENERIC', // Default value
                architecture: 'unknown', // Default value
                ipAddress: deviceData.ipAddress,
                status: deviceData.status as any,
                customer: {
                    connect: {
                        id: 'default-customer-id' // You need to provide a valid customer ID
                    }
                }
            }
        });
    }

    async delete(id: DeviceId): Promise<void> {
        await this.prisma.device.delete({
            where: { id: id.value }
        });
    }
}
