'use client';

import React, {createContext, ReactNode, useContext, useMemo} from 'react';
import {CommandBus, InMemoryCommandBus} from '@iotpilot/core/shared/application/bus/command.bus';
import {QueryBus, InMemoryQueryBus} from '@iotpilot/core/shared/application/bus/query.bus';
import {EventBus, InMemoryEventBus} from '@iotpilot/core/shared/application/bus/event.bus';

interface DDDContextType {
    commandBus: CommandBus;
    queryBus: QueryBus;
    eventBus: EventBus;
}

const DDDContext = createContext<DDDContextType | null>(null);

export function DDDProvider({children}: {children: ReactNode}) {
    const buses = useMemo(() => ({
        commandBus: new InMemoryCommandBus(),
        queryBus: new InMemoryQueryBus(),
        eventBus: new InMemoryEventBus(),
    }), []);

    return (
        <DDDContext.Provider value={buses}>
            {children}
        </DDDContext.Provider>
    );
}

export function useDDD() {
    const context = useContext(DDDContext);
    if (!context) throw new Error('useDDD must be used within a DDDProvider');
    return context;
}

export const useCommandBus = () => useDDD().commandBus;
export const useQueryBus = () => useDDD().queryBus;
export const useEventBus = () => useDDD().eventBus;
