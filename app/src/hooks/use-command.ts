import {useState, useCallback} from 'react';
import {useCommandBus} from '@/context/ddd.context';
import {Command} from '@/lib/shared/application/interfaces/command.interface';

export function useCommand<T extends Command, R = void>() {
    const commandBus = useCommandBus();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (command: T): Promise<R | void> => {
        try {
            setLoading(true);
            setError(null);
            return await commandBus.execute(command);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [commandBus]);

    const reset = useCallback(() => {
        setError(null);
    }, []);

    return {
        execute,
        loading,
        error,
        reset
    };
}
