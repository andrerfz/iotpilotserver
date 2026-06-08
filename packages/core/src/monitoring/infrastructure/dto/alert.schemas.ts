import {z} from 'zod';
import {AlertSeverityEnum, AlertTypeEnum} from '@iotpilot/core/shared/infrastructure/dto/common.schemas';

export const AlertResponseSchema = z.object({
    id: z.string(),
    deviceId: z.string(),
    customerId: z.string(),
    type: AlertTypeEnum,
    severity: AlertSeverityEnum,
    title: z.string(),
    message: z.string(),
    resolved: z.boolean(),
    resolvedAt: z.string().nullable(),
    createdAt: z.string(),
});

export const CreateAlertInputSchema = z.object({
    deviceId: z.string(),
    type: AlertTypeEnum,
    severity: AlertSeverityEnum,
    title: z.string(),
    message: z.string(),
});

export type AlertResponse = z.infer<typeof AlertResponseSchema>;
export type CreateAlertInput = z.infer<typeof CreateAlertInputSchema>;
