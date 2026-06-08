import {useCallback, useState} from 'react';
import { apiUrl } from '@/utils/api-url';

/**
 * A generic hook for executing queries via API calls.
 * @template T The shape of the query parameters (plain object).
 * @template R The expected return type of the query result.
 * @param endpoint The API endpoint to call (e.g., '/api/devices')
 * @returns An object with execute function, loading state, error state, and data state.
 */
export function useQuery<T extends Record<string, unknown>, R>(endpoint: string): {
    execute: (query?: T) => Promise<R>;
    data: R | null;
    loading: boolean;
    error: string | null;
} {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<R | null>(null);

    const execute = useCallback(async (query?: T): Promise<R> => {
        try {
            setLoading(true);
            setError(null);
            setData(null);

            // Build URL with query parameters if query is provided
            let url = endpoint;
            if (query) {
                const params = new URLSearchParams();
                Object.entries(query).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && key !== 'constructor') {
                        params.append(key, String(value));
                    }
                });
                const queryString = params.toString();
                url = queryString ? `${endpoint}?${queryString}` : endpoint;
            }

            // Make API call to the server
            const response = await fetch(apiUrl(url), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies for authentication
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            const result = await response.json();
            // Extract data from standard API response format
            const extractedData = (result.data || result) as R;
            setData(extractedData);
            return extractedData;
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
        error,
        data
    };
}