'use client';

import React, {createContext, ReactNode, useContext, useMemo} from 'react';
import {CommandBus} from '@/lib/shared/application/bus/command.bus';
import {QueryBus} from '@/lib/shared/application/bus/query.bus';
import {EventBus} from '@/lib/shared/application/bus/event.bus';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';

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
        // Use the ServiceContainer singleton to get the buses
        // This ensures consistency between frontend and backend
        const serviceContainer = ServiceContainer.getInstance();
        
        return {
            commandBus: serviceContainer.getCommandBus(),
            queryBus: serviceContainer.getQueryBus(),
            eventBus: serviceContainer.getEventBus()
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