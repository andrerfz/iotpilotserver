import { Device } from '../entities/device.entity';
import { DeviceId } from '../value-objects/device-id.vo';
import { Repository } from '@/lib/shared/domain/interfaces/repository.interface';

export interface DeviceRepository extends Repository<Device, DeviceId> {
    findByName(name: string): Promise<Device | null>;
    findByIpAddress(ipAddress: string): Promise<Device | null>;
    findActive(): Promise<Device[]>;
    findInactive(): Promise<Device[]>;
}