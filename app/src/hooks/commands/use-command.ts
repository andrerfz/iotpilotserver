import {useCallback, useState} from 'react';
import {Command} from '@/lib/shared/domain/command';

/**
 * A generic hook for executing domain commands via API calls.
 * Commands are sent to the server which executes them through the CommandBus.
 * @template T The type of the command to execute.
 * @template R The type of the result returned by the command.
 * @param endpoint The API endpoint to call (e.g., '/api/auth/login')
 * @returns An object with execute function, loading state, and error state.
 */
export function useCommand<T extends Command, R = void>(endpoint: string): {
    execute: (command: T) => Promise<R>;
    loading: boolean;
    error: string | null;
} {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (command: T): Promise<R> => {
        try {
            setLoading(true);
            setError(null);

            // Make API call to the server
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(command),
                credentials: 'include', // Include cookies for authentication
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            const result = await response.json();
            // Extract data from standard API response format
            return (result.data || result) as R;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    return {
        execute,
        loading,
        error
    };
}