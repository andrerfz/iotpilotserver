import {createContext, ReactNode, useContext, useMemo} from 'react';
import {QueryBus} from '@/lib/shared/application/bus/query.bus';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';

const QueryBusContext = createContext<QueryBus | null>(null);

export function QueryBusProvider({ children }: { children: ReactNode }) {
    // Use ServiceContainer's query bus which already has all handlers registered
    // This ensures consistency between API routes and React components
    // All handlers are registered in ServiceContainer.registerHandlers()
    const queryBus = useMemo(() => {
        return ServiceContainer.getInstance().getQueryBus();
    }, []);

    return (
        <QueryBusContext.Provider value={queryBus}>
            {children}
        </QueryBusContext.Provider>
    );
}

export function useQueryBus() {
    const context = useContext(QueryBusContext);
    if (!context) {
        throw new Error('useQueryBus must be used within QueryBusProvider');
    }
    return context;
}
