import {useCallback, useState} from 'react';
import { apiUrl } from '@/utils/api-url';

/**
 * A generic hook for executing commands via API calls.
 * @template T The shape of the command payload (plain object).
 * @template R The type of the result returned by the API.
 * @param endpoint The API endpoint to call (e.g., '/api/auth/login')
 * @returns An object with execute function, loading state, and error state.
 */
export function useCommand<T extends Record<string, unknown>, R = void>(
    endpoint: string,
    options?: { method?: string }
): {
    execute: (command: T) => Promise<R>;
    loading: boolean;
    error: string | null;
} {
    const method = options?.method ?? 'POST';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (command: T): Promise<R> => {
        try {
            setLoading(true);
            setError(null);

            // Make API call to the server
            const response = await fetch(apiUrl(endpoint), {
                method,
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
    }, [endpoint, method]);

    return {
        execute,
        loading,
        error
    };
}