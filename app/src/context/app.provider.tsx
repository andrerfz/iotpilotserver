import { ReactNode } from 'react';
import { CommandBusProvider } from './command-bus.context';
import { QueryBusProvider } from './query-bus.context';
import { EventBusProvider } from './event-bus.context';

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
    return (
        <EventBusProvider>
            <CommandBusProvider>
                <QueryBusProvider>
                    {children}
                </QueryBusProvider>
            </CommandBusProvider>
        </EventBusProvider>
    );
}