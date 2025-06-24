import { useState, useCallback } from 'react';
import { useCommandBus } from '../context/command-bus.context';

export function useCommand<T>() {
    const commandBus = useCommandBus();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (command: T) => {
        try {
            setLoading(true);
            setError(null);
            await commandBus.execute(command);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [commandBus]);

    return {
        execute,
        loading,
        error
    };
}