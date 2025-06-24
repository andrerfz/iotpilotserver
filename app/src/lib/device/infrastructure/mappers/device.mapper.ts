import { Device } from '../../domain/entities/device.entity';
import { DeviceId } from '../../domain/value-objects/device-id.vo';
import { DeviceName } from '../../domain/value-objects/device-name.vo';
import { IpAddress } from '../../domain/value-objects/ip-address.vo';
import { DeviceStatus } from '../../domain/value-objects/device-status.vo';
import { SshCredentials } from '../../domain/value-objects/ssh-credentials.vo';

// Define the shape of the device data in the database
export interface DevicePersistence {
    id: string;
    name: string;
    ipAddress: string;
    status: string;
    sshUsername: string;
    sshPassword?: string;
    sshPrivateKey?: string;
    sshPort: number;
    createdAt: Date;
    updatedAt: Date;
}

export class DeviceMapper {
    static toDomain(persistence: DevicePersistence): Device {
        return new Device(
            DeviceId.fromString(persistence.id),
            DeviceName.create(persistence.name),
            IpAddress.create(persistence.ipAddress),
            DeviceStatus.create(persistence.status as any),
            SshCredentials.create({
                username: persistence.sshUsername,
                password: persistence.sshPassword,
                privateKey: persistence.sshPrivateKey,
                port: persistence.sshPort
            }),
            persistence.createdAt,
            persistence.updatedAt
        );
    }

    static toPersistence(domain: Device): DevicePersistence {
        return {
            id: domain.id.value,
            name: domain.name.value,
            ipAddress: domain.ipAddress.value,
            status: domain.status.value,
            sshUsername: domain.sshCredentials.username,
            sshPassword: domain.sshCredentials.password,
            sshPrivateKey: domain.sshCredentials.privateKey,
            sshPort: domain.sshCredentials.port,
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt
        };
    }
}