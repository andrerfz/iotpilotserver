import {createContext, ReactNode, useContext, useMemo} from 'react';
import {QueryBus} from '../lib/shared/application/bus/query.bus';
import {ServiceContainer} from '../lib/shared/infrastructure/container/service-container';

const QueryBusContext = createContext<QueryBus | null>(null);

export function QueryBusProvider({ children }: { children: ReactNode }) {
    const queryBus = useMemo(() => {
        // Use the ServiceContainer singleton to get the query bus
        // This ensures consistency between frontend and backend
        const serviceContainer = ServiceContainer.getInstance();
        return serviceContainer.getQueryBus();
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