import { prisma } from '@iotpilot/core/shared/infrastructure/database/prisma.service';

export async function resolveDevicePublicId(publicId: string): Promise<string | null> {
    const record = await prisma.getClient().device.findUnique({ where: { publicId }, select: { id: true } });
    return record?.id ?? null;
}

export async function getDevicePublicId(internalId: string): Promise<string | null> {
    const record = await prisma.getClient().device.findUnique({ where: { id: internalId }, select: { publicId: true } });
    return record?.publicId ?? null;
}
