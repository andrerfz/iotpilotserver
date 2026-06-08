import {z} from 'zod';

// ── Reusable enums ──────────────────────────────────────────

export const DeviceStatusEnum = z.enum([
    'ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR', 'UNCLAIMED', 'PENDING_SETUP'
]);

import {DeviceModelEnum} from '@iotpilot/core/device/domain/value-objects/device-type.vo';

export const DeviceTypeEnum = z.enum(
    Object.values(DeviceModelEnum) as [string, ...string[]]
);

export const UserRoleEnum = z.enum([
    'USER', 'ADMIN', 'SUPERADMIN'
]);

export const AlertSeverityEnum = z.enum([
    'INFO', 'WARNING', 'CRITICAL'
]);

export const AlertTypeEnum = z.enum([
    'DEVICE_OFFLINE', 'DEVICE_REGISTERED', 'HIGH_CPU', 'HIGH_MEMORY',
    'HIGH_TEMPERATURE', 'LOW_DISK_SPACE', 'LOW_BATTERY', 'APPLICATION_ERROR',
    'SYSTEM_ERROR', 'SECURITY_ALERT', 'CUSTOM'
]);

export const PaginationParamsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Inferred types (for frontend) ───────────────────────────

export type DeviceStatus = z.infer<typeof DeviceStatusEnum>;
export type DeviceType = z.infer<typeof DeviceTypeEnum>;
export type UserRole = z.infer<typeof UserRoleEnum>;
export type AlertSeverity = z.infer<typeof AlertSeverityEnum>;
export type AlertType = z.infer<typeof AlertTypeEnum>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
