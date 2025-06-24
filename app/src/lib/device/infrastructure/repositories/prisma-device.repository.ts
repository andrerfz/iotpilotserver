import { PrismaClient } from '@prisma/client';
import { Device } from '../../domain/entities/device.entity';
import { DeviceId } from '../../domain/value-objects/device-id.vo';
import { DeviceRepository } from '../../domain/interfaces/device-repository.interface';
import { DeviceMapper, DevicePersistence } from '../mappers/device.mapper';

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
            where: { name }
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
            where: { status: 'active' }
        });

        return devicesData.map(device => 
            DeviceMapper.toDomain(device as unknown as DevicePersistence)
        );
    }

    async findInactive(): Promise<Device[]> {
        const devicesData = await this.prisma.device.findMany({
            where: { status: 'inactive' }
        });

        return devicesData.map(device => 
            DeviceMapper.toDomain(device as unknown as DevicePersistence)
        );
    }

    async save(device: Device): Promise<void> {
        const deviceData = DeviceMapper.toPersistence(device);
        
        await this.prisma.device.upsert({
            where: { id: deviceData.id },
            update: deviceData,
            create: deviceData
        });
    }

    async delete(id: DeviceId): Promise<void> {
        await this.prisma.device.delete({
            where: { id: id.value }
        });
    }
}