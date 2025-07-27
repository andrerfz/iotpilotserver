import {createContext, ReactNode, useContext, useMemo} from 'react';
import {EventBus, InMemoryEventBus} from '@/lib/shared/application/bus/event.bus';

const EventBusContext = createContext<EventBus | null>(null);

export function EventBusProvider({ children }: { children: ReactNode }) {
    const eventBus = useMemo(() => {
        const bus = new InMemoryEventBus();
        // Event handlers can be registered here if needed
        return bus;
    }, []);

    return (
        <EventBusContext.Provider value={eventBus}>
            {children}
        </EventBusContext.Provider>
    );
}

export function useEventBus() {
    const context = useContext(EventBusContext);
    if (!context) {
        throw new Error('useEventBus must be used within EventBusProvider');
    }
    return context;
}

