import { tenantPrisma } from '@iotpilot/core/tenant-middleware';

export async function resolveAlertPublicId(publicId: string): Promise<string | null> {
    const record = await tenantPrisma.client.alert.findUnique({ where: { publicId }, select: { id: true } });
    return record?.id ?? null;
}

export async function getAlertPublicId(internalId: string): Promise<string | null> {
    const record = await tenantPrisma.client.alert.findUnique({ where: { id: internalId }, select: { publicId: true } });
    return record?.publicId ?? null;
}
