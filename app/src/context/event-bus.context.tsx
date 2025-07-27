import {createContext, ReactNode, useContext, useEffect, useMemo} from 'react';
import {EventBus} from '../lib/shared/application/bus/event.bus';
import {DomainEvent} from '../lib/shared/domain/events/domain.event';
import {ServiceContainer} from '../lib/shared/infrastructure/container/service-container';

const EventBusContext = createContext<EventBus | null>(null);

export function EventBusProvider({ children }: { children: ReactNode }) {
    const eventBus = useMemo(() => {
        // Use the ServiceContainer singleton to get the event bus
        // This ensures consistency between frontend and backend
        const serviceContainer = ServiceContainer.getInstance();
        return serviceContainer.getEventBus();
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

// Custom hook to subscribe to events
export function useEventSubscription<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
) {
    const eventBus = useEventBus();

    useEffect(() => {
        eventBus.subscribe<T>(eventType, handler);

        // No need to unsubscribe as the event bus doesn't provide that functionality
        // If needed, we could enhance the event bus to support unsubscribing
    }, [eventBus, eventType, handler]);
}
