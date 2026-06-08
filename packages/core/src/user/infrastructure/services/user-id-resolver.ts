import { tenantPrisma } from '@iotpilot/core/tenant-middleware';

export async function resolveUserPublicId(publicId: string): Promise<string | null> {
    const record = await tenantPrisma.client.user.findUnique({ where: { publicId }, select: { id: true } });
    return record?.id ?? null;
}

export async function getUserPublicId(internalId: string): Promise<string | null> {
    const record = await tenantPrisma.client.user.findUnique({ where: { id: internalId }, select: { publicId: true } });
    return record?.publicId ?? null;
}
