import {createContext, ReactNode, useContext, useMemo} from 'react';
import {QueryBus, InMemoryQueryBus} from '@iotpilot/core/shared/application/bus/query.bus';

const QueryBusContext = createContext<QueryBus | null>(null);

export function QueryBusProvider({ children }: { children: ReactNode }) {
    const queryBus = useMemo(() => new InMemoryQueryBus(), []);

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
