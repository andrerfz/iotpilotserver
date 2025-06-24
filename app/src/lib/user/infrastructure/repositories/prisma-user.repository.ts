import {PrismaClient} from '@prisma/client';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {User} from '@/lib/user/domain/entities/user.entity';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {UserMapper} from '../mappers/user.mapper';

export class PrismaUserRepository implements UserRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findById(id: UserId): Promise<User | null> {
        const userData = await this.prisma.user.findUnique({
            where: { id: id.getValue() }
        });

        return userData ? UserMapper.toDomain(userData) : null;
    }

    async findByEmail(email: Email): Promise<User | null> {
        const userData = await this.prisma.user.findUnique({
            where: { email: email.getValue() }
        });

        return userData ? UserMapper.toDomain(userData) : null;
    }

    async emailExists(email: Email): Promise<boolean> {
        const count = await this.prisma.user.count({
            where: { email: email.getValue() }
        });

        return count > 0;
    }

    async findAll(): Promise<User[]> {
        const users = await this.prisma.user.findMany();
        return users.map(UserMapper.toDomain);
    }

    async save(user: User): Promise<void> {
        const userData = UserMapper.toPersistence(user);

        await this.prisma.user.upsert({
            where: { id: userData.id },
            update: userData,
            create: userData
        });
    }

    async delete(id: UserId): Promise<void> {
        await this.prisma.user.delete({
            where: { id: id.getValue() }
        });
    }
}