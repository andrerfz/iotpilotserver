import {useQuery} from './use-query';

interface UserQueryParams {
    [key: string]: unknown;
}

interface ListUsersParams {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
    [key: string]: unknown;
}

interface UserData {
    id: string;
    email: string;
    username: string;
    role: string;
    customerId: string | null;
    status: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
}

interface ListUsersResult {
    users: UserData[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface SessionValidationResult {
    valid: boolean;
    user: UserData | null;
}

export function useUserQueries() {
    const getCurrentUserQuery = useQuery<UserQueryParams, UserData>('/api/users/current');
    const validateSessionQuery = useQuery<UserQueryParams, SessionValidationResult>('/api/auth/session');
    const listUsersQuery = useQuery<ListUsersParams, ListUsersResult>('/api/users');

    return {
        getCurrentUser: getCurrentUserQuery.execute,
        validateSession: validateSessionQuery.execute,
        listUsers: listUsersQuery.execute,
        currentUserData: getCurrentUserQuery.data,
        sessionValidationData: validateSessionQuery.data,
        listUsersData: listUsersQuery.data,
        loading: getCurrentUserQuery.loading || validateSessionQuery.loading || listUsersQuery.loading,
        error: getCurrentUserQuery.error || validateSessionQuery.error || listUsersQuery.error,
    };
}
