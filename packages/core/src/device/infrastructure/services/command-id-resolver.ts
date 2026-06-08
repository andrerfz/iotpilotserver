import { tenantPrisma } from '@iotpilot/core/tenant-middleware';

export async function resolveCommandPublicId(publicId: string): Promise<string | null> {
    const record = await tenantPrisma.client.deviceCommand.findUnique({ where: { publicId }, select: { id: true } });
    return record?.id ?? null;
}

export async function getCommandPublicId(internalId: string): Promise<string | null> {
    const record = await tenantPrisma.client.deviceCommand.findUnique({ where: { id: internalId }, select: { publicId: true } });
    return record?.publicId ?? null;
}
