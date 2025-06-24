import { createContext, useContext, useMemo, ReactNode } from 'react';
import { PrismaClient } from '@prisma/client';
import { QueryBus, InMemoryQueryBus } from '../lib/shared/application/bus/query.bus';
import { PrismaDeviceRepository } from '../lib/device/infrastructure/repositories/prisma-device.repository';

// Example query and handler imports (these would need to be created)
// import { GetDeviceQuery } from '../lib/device/application/queries/get-device/get-device.query';
// import { GetDeviceHandler } from '../lib/device/application/queries/get-device/get-device.handler';

// Use the same PrismaClient instance as in command-bus.context.tsx
const prisma = new PrismaClient();

const QueryBusContext = createContext<QueryBus | null>(null);

export function QueryBusProvider({ children }: { children: ReactNode }) {
    const queryBus = useMemo(() => {
        const bus = new InMemoryQueryBus();

        // Register handlers
        // Example: 
        // bus.register(GetDeviceQuery, new GetDeviceHandler(
        //     new PrismaDeviceRepository(prisma)
        // ));

        return bus;
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