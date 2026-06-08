/**
 * Frontend-safe enum types and role utilities.
 *
 * Re-exports string unions from Phase 1 DTO schemas so the frontend
 * never needs to import domain value objects.
 */

export type { DeviceStatus, DeviceType, AlertSeverity, AlertType } from '@iotpilot/core/shared/infrastructure/dto/common.schemas';

// UserRole from the DTO schema doesn't include READONLY which the domain VO has.
// The frontend needs the full set for protected-route role checks.
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'USER' | 'READONLY';

/** Role hierarchy: READONLY < USER < ADMIN < SUPERADMIN */
const ROLE_LEVEL: Record<UserRole, number> = {
    READONLY: 0,
    USER: 1,
    ADMIN: 2,
    SUPERADMIN: 3,
};

/**
 * Check if `actualRole` meets or exceeds `requiredRole` in the hierarchy.
 * Replaces `UserRole.fromString(role).hasRole(required)` from the domain VO.
 */
export function hasRole(actualRole: string, requiredRole: UserRole): boolean {
    const actual = ROLE_LEVEL[actualRole as UserRole];
    const required = ROLE_LEVEL[requiredRole];
    if (actual === undefined || required === undefined) return false;
    return actual >= required;
}
