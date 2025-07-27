import {useQuery} from './use-query';
import {GetCurrentUserQuery} from '@/lib/user/application/queries/get-current-user/get-current-user.query';
import {ValidateSessionQuery} from '@/lib/user/application/queries/validate-session/validate-session.query';

interface UserData {
    id: string;
    email: string;
    username: string;
    role: string;
    customerId: string | null;
    status: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
}

interface SessionValidationResult {
    valid: boolean;
    user: UserData | null;
}

/**
 * A hook for executing user-specific queries via API calls.
 * @returns Functions to execute user queries with loading, error, and data states.
 */
export function useUserQueries() {
    const getCurrentUserQuery = useQuery<GetCurrentUserQuery, UserData>('/api/users/current');
    const validateSessionQuery = useQuery<ValidateSessionQuery, SessionValidationResult>('/api/auth/session');

    return {
        getCurrentUser: getCurrentUserQuery.execute,
        validateSession: validateSessionQuery.execute,
        currentUserData: getCurrentUserQuery.data,
        sessionValidationData: validateSessionQuery.data,
        loading: getCurrentUserQuery.loading || validateSessionQuery.loading,
        error: getCurrentUserQuery.error || validateSessionQuery.error
    };
}

