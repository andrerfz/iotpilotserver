import {createContext, ReactNode, useContext, useMemo} from 'react';
import {CommandBus} from '../lib/shared/application/bus/command.bus';
import {ServiceContainer} from '../lib/shared/infrastructure/container/service-container';

const CommandBusContext = createContext<CommandBus | null>(null);

export function CommandBusProvider({ children }: { children: ReactNode }) {
    const commandBus = useMemo(() => {
        // Use the ServiceContainer singleton to get the command bus
        // This ensures consistency between frontend and backend
        const serviceContainer = ServiceContainer.getInstance();
        return serviceContainer.getCommandBus();
    }, []);

    return (
        <CommandBusContext.Provider value={commandBus}>
            {children}
        </CommandBusContext.Provider>
    );
}

export function useCommandBus() {
    const context = useContext(CommandBusContext);
    if (!context) {
        throw new Error('useCommandBus must be used within CommandBusProvider');
    }
    return context;
}