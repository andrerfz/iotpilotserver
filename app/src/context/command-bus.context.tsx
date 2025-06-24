import { createContext, useContext, useMemo, ReactNode } from 'react';
import { PrismaClient } from '@prisma/client';
import { CommandBus, InMemoryCommandBus } from '../lib/shared/application/bus/command.bus';
import { PrismaDeviceRepository } from '../lib/device/infrastructure/repositories/prisma-device.repository';

// Example command and handler imports (these would need to be created)
// import { RegisterDeviceCommand } from '../lib/device/application/commands/register-device/register-device.command';
// import { RegisterDeviceHandler } from '../lib/device/application/commands/register-device/register-device.handler';

// Create a singleton PrismaClient instance
const prisma = new PrismaClient();

const CommandBusContext = createContext<CommandBus | null>(null);

export function CommandBusProvider({ children }: { children: ReactNode }) {
    const commandBus = useMemo(() => {
        const bus = new InMemoryCommandBus();

        // Register handlers
        // Example: 
        // bus.register(RegisterDeviceCommand, new RegisterDeviceHandler(
        //     new PrismaDeviceRepository(prisma)
        // ));

        return bus;
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