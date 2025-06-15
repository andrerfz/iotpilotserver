import { UserRole } from '@prisma/client';

// Define the role hierarchy
const roleHierarchy: Record<UserRole, number> = {
  READONLY: 0,
  USER: 1,
  ADMIN: 2,
  SUPERADMIN: 3
};

export interface User {
  id: string;
  email: string;
  role: UserRole;
  [key: string]: any; // Allow for additional properties
}

export interface Session {
  user?: User;
  role?: UserRole;
  [key: string]: any; // Allow for additional properties
}

/**
 * Check if a user has a specific role or higher
 * @param userRole The user's role
 * @param requiredRole The required role
 * @returns True if the user has the required role or higher
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if a user is an admin (ADMIN or SUPERADMIN)
 * @param userRole The user's role
 * @returns True if the user is an admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return hasRole(userRole, 'ADMIN');
}

/**
 * Check if a user is a super admin
 * @param userRole The user's role
 * @returns True if the user is a super admin
 */
export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === 'SUPERADMIN';
}

/**
 * Check if a session has a specific role or higher
 * @param session The session object
 * @param requiredRole The required role
 * @returns True if the session has the required role or higher
 */
export function sessionHasRole(session: Session | null, requiredRole: UserRole): boolean {
  if (!session) return false;
  
  // Handle different session structures
  const role = session.role || session.user?.role;
  if (!role) return false;
  
  return hasRole(role, requiredRole);
}

/**
 * Check if a session is for an admin user
 * @param session The session object
 * @returns True if the session is for an admin user
 */
export function sessionIsAdmin(session: Session | null): boolean {
  if (!session) return false;
  
  // Handle different session structures
  const role = session.role || session.user?.role;
  if (!role) return false;
  
  return isAdmin(role);
}

/**
 * Check if a session is for a super admin user
 * @param session The session object
 * @returns True if the session is for a super admin user
 */
export function sessionIsSuperAdmin(session: Session | null): boolean {
  if (!session) return false;
  
  // Handle different session structures
  const role = session.role || session.user?.role;
  if (!role) return false;
  
  return isSuperAdmin(role);
}