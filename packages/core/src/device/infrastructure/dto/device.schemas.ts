import {z} from 'zod';
import {DeviceStatusEnum, DeviceTypeEnum} from '@iotpilot/core/shared/infrastructure/dto/common.schemas';

// ── Device response ─────────────────────────────────────────

export const DeviceResponseSchema = z.object({
    id: z.string(),
    deviceId: z.string(),
    name: z.string(),
    status: DeviceStatusEnum,
    deviceType: DeviceTypeEnum,
    deviceModel: z.string().nullable(),
    ipAddress: z.string().nullable(),
    macAddress: z.string().nullable(),
    lastSeen: z.string().nullable(),
    agentVersion: z.string().nullable(),
    customerId: z.string().nullable(),
    registeredAt: z.string(),
});

// ── Claim device ────────────────────────────────────────────

export const ClaimDeviceInputSchema = z.object({
    deviceId: z.string().min(1, 'deviceId is required'),
    name: z.string().optional(),
});

export const ClaimDeviceResponseSchema = z.object({
    deviceId: z.string(),
    claimingToken: z.string(),
    expiresAt: z.string(),
    instructions: z.string(),
});

// ── Activate device ─────────────────────────────────────────

export const ActivateDeviceInputSchema = z.object({
    deviceId: z.string().min(1),
    claimingToken: z.string().min(1),
    macAddress: z.string().optional(),
    ipAddress: z.string().optional(),
    firmwareVersion: z.string().optional(),
    deviceModel: z.string().optional(),
});

export const ActivateDeviceResponseSchema = z.object({
    credentials: z.object({
        apiKey: z.string(),
        webhookUrl: z.string(),
    }),
    config: z.object({
        reportingInterval: z.number(),
        deepSleepEnabled: z.boolean(),
    }),
});

// ── Temperature webhook ─────────────────────────────────────

export const SensorReadingSchema = z.object({
    temperature: z.number(),
    cycle: z.number().optional(),
    offsetSeconds: z.number().min(0).optional(),  // seconds before arrival (buffered readings)
});

// Canonical sensor-webhook request body — the SINGLE source of truth.
// apps/backend's iot.router.ts validates POST /api/webhook/temperature with this
// exact schema (it must not redefine its own copy). Keep in sync with the firmware
// payload and docs/openapi-autogen.md.
export const TemperatureWebhookInputSchema = z.object({
    deviceId: z.string().min(1),
    readings: z.array(SensorReadingSchema).optional(),  // optional when sensorError: true
    batteryLevel: z.number().min(0).max(100).optional(),
    batteryVoltage: z.number().optional(),
    rssi: z.number().optional(),
    firmwareVersion: z.string().optional(),
    alertPending: z.boolean().optional(),
    alertTemp: z.number().optional(),
    sensorError: z.boolean().optional(),
    batteryLow: z.boolean().optional(),
});

// Response payload (the `data` field of the send.ok envelope) returned to the device.
export const TemperatureWebhookResponseSchema = z.object({
    success: z.boolean(),
    deviceId: z.string(),
    config: z.object({
        reportingInterval: z.number(),
        deepSleepEnabled: z.boolean(),
    }),
    firmware: z.object({
        targetVersion: z.string(),
        url: z.string(),
    }).optional(),
});

// ── Pre-register devices (admin) ────────────────────────────

export const PreregisterDevicesInputSchema = z.object({
    count: z.number().int().min(1).max(500),
});

export const PreregisterDevicesResponseSchema = z.object({
    devices: z.array(z.string()),
    count: z.number(),
});

// ── Inferred types (for frontend) ───────────────────────────

export type DeviceResponse = z.infer<typeof DeviceResponseSchema>;
export type ClaimDeviceInput = z.infer<typeof ClaimDeviceInputSchema>;
export type ClaimDeviceResponse = z.infer<typeof ClaimDeviceResponseSchema>;
export type ActivateDeviceInput = z.infer<typeof ActivateDeviceInputSchema>;
export type ActivateDeviceResponse = z.infer<typeof ActivateDeviceResponseSchema>;
export type TemperatureWebhookInput = z.infer<typeof TemperatureWebhookInputSchema>;
export type TemperatureWebhookResponse = z.infer<typeof TemperatureWebhookResponseSchema>;
