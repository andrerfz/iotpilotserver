// Frontend API types — re-exported from Phase 1 DTO schemas.
// Components and hooks should import from here instead of
// reaching into infrastructure/dto/ directly.

// ── Device types ───────────────────────────────────────────
export type {
    DeviceResponse,
    ClaimDeviceInput,
    ClaimDeviceResponse,
    ActivateDeviceInput,
    ActivateDeviceResponse,
    TemperatureWebhookInput,
    TemperatureWebhookResponse,
} from '@iotpilot/core/device/infrastructure/dto/device.schemas';

// ── User types ─────────────────────────────────────────────
export type {
    LoginInput,
    RegisterInput,
    UserResponse,
    LoginResponse,
} from '@iotpilot/core/user/infrastructure/dto/user.schemas';

// ── Shared types ───────────────────────────────────────────
export type { PaginationParams } from '@iotpilot/core/shared/infrastructure/dto/common.schemas';

// ── Enums (re-export for convenience) ──────────────────────
export type { DeviceStatus, DeviceType, AlertSeverity, AlertType, UserRole } from './enums';
export { hasRole } from './enums';
