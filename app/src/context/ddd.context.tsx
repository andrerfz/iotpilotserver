'use client';

import React, {createContext, useContext, ReactNode, useMemo} from 'react';
import {CommandBus, InMemoryCommandBus} from '@/lib/shared/application/bus/command.bus';
import {QueryBus, InMemoryQueryBus} from '@/lib/shared/application/bus/query.bus';
import {EventBus, InMemoryEventBus} from '@/lib/shared/application/bus/event.bus';

interface DDDContextType {
    commandBus: CommandBus;
    queryBus: QueryBus;
    eventBus: EventBus;
}

const DDDContext = createContext<DDDContextType | null>(null);

export function DDDProvider({children}: {
    children: ReactNode
}) {
    const buses = useMemo(() => {
        const commandBus = new InMemoryCommandBus();
        const queryBus = new InMemoryQueryBus();
        const eventBus = new InMemoryEventBus();

        // Register handlers here when available
        // TODO: This will be populated in later phases

        return {
            commandBus,
            queryBus,
            eventBus
        };
    }, []);

    return (
        <DDDContext.Provider value={buses}>
            {children}
        </DDDContext.Provider>
    );
}

export function useDDD() {
    const context = useContext(DDDContext);
    if (!context) {
        throw new Error('useDDD must be used within a DDDProvider');
    }
    return context;
}

export function useCommandBus() {
    return useDDD().commandBus;
}

export function useQueryBus() {
    return useDDD().queryBus;
}

export function useEventBus() {
    return useDDD().eventBus;
}