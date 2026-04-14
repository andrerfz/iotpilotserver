import {useCommand} from './use-command';

interface RegisterPayload {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    [key: string]: unknown;
}

interface LoginPayload {
    email: string;
    password: string;
    remember?: boolean;
    [key: string]: unknown;
}

interface LogoutPayload {
    [key: string]: unknown;
}

interface AuthenticationResult {
    user: {
        id: string;
        email: string;
        username: string;
        role: string;
        customerId: string | null;
    };
    token: string;
}

interface RegisterResult {
    user: {
        id: string;
        email: string;
        username: string;
        role: string;
    };
}

export function useUserCommands() {
    const registerCommand = useCommand<RegisterPayload, RegisterResult>('/api/auth/register');
    const authenticateCommand = useCommand<LoginPayload, AuthenticationResult>('/api/auth/login');
    const logoutCommand = useCommand<LogoutPayload, void>('/api/auth/logout');

    return {
        registerUser: registerCommand.execute,
        authenticateUser: authenticateCommand.execute,
        logoutUser: logoutCommand.execute,
        loading: registerCommand.loading || authenticateCommand.loading || logoutCommand.loading,
        error: registerCommand.error || authenticateCommand.error || logoutCommand.error
    };
}
