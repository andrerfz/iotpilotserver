import { useState, useCallback } from 'react';
import { useQueryBus } from '../context/query-bus.context';

export function useQuery<T, R>() {
    const queryBus = useQueryBus();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<R | null>(null);

    const execute = useCallback(async (query: T): Promise<R> => {
        try {
            setLoading(true);
            setError(null);
            const result = await queryBus.execute<T, R>(query);
            setData(result);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [queryBus]);

    return {
        execute,
        loading,
        error,
        data
    };
}