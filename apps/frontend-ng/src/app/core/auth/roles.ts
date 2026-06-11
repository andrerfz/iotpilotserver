/**
 * Role hierarchy, mirroring the backend `UserRole.hasRole`
 * (packages/core .../user-role.vo.ts): READONLY < USER < ADMIN < SUPERADMIN.
 */
export type Role = 'READONLY' | 'USER' | 'ADMIN' | 'SUPERADMIN';

const RANK: Record<Role, number> = {
  READONLY: 0,
  USER: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

/**
 * True when `actual` satisfies `required` or a higher rank. Unknown / null roles
 * never satisfy a requirement.
 */
export function hasRole(actual: string | null | undefined, required: Role): boolean {
  if (!actual || !(actual in RANK)) {
    return false;
  }
  return RANK[actual as Role] >= RANK[required];
}
