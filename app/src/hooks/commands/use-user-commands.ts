import {useCommand} from './use-command';
import {
    PublicRegisterUserCommand
} from '@/lib/user/application/commands/public-register-user/public-register-user.command';
import {AuthenticateUserCommand} from '@/lib/user/application/commands/authenticate-user/authenticate-user.command';
import {LogoutUserCommand} from '@/lib/user/application/commands/logout-user/logout-user.command';

/**
 * Result types for user commands
 */
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

/**
 * A hook for executing user-specific commands via API calls.
 * @returns Functions to execute user commands with loading and error states.
 */
export function useUserCommands() {
    const registerCommand = useCommand<PublicRegisterUserCommand, RegisterResult>('/api/auth/register');
    const authenticateCommand = useCommand<AuthenticateUserCommand, AuthenticationResult>('/api/auth/login');
    const logoutCommand = useCommand<LogoutUserCommand, void>('/api/auth/logout');

    return {
        registerUser: registerCommand.execute,
        authenticateUser: authenticateCommand.execute,
        logoutUser: logoutCommand.execute,
        loading: registerCommand.loading || authenticateCommand.loading || logoutCommand.loading,
        error: registerCommand.error || authenticateCommand.error || logoutCommand.error
    };
}

