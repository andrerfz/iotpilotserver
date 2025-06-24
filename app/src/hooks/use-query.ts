import {useState, useCallback} from 'react';
import {useQueryBus} from '@/context/ddd.context';
import {Query} from '@/lib/shared/application/interfaces/query.interface';

export function useQuery<T extends Query<R>, R = any>() {
    const queryBus = useQueryBus();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<R | null>(null);

    const execute = useCallback(async (query: T): Promise<R> => {
        try {
            setLoading(true);
            setError(null);
            const result = await queryBus.execute(query);
            setData(result);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [queryBus]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
    }, []);

    return {
        execute,
        loading,
        error,
        data,
        reset
    };
}
