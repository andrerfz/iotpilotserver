import { createContext, useContext, useMemo, ReactNode, useEffect } from 'react';
import { EventBus, InMemoryEventBus, DomainEvent } from '../lib/shared/application/bus/event.bus';

// Example event handler imports (these would need to be created)
// import { DeviceRegisteredEvent } from '../lib/device/domain/events/device-registered.event';

const EventBusContext = createContext<EventBus | null>(null);

export function EventBusProvider({ children }: { children: ReactNode }) {
    const eventBus = useMemo(() => {
        const bus = new InMemoryEventBus();

        // Register event handlers
        // Example:
        // bus.subscribe<DeviceRegisteredEvent>(
        //     'DeviceRegisteredEvent',
        //     async (event) => {
        //         console.log('Device registered:', event);
        //         // Perform side effects like notifications, analytics, etc.
        //     }
        // );

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