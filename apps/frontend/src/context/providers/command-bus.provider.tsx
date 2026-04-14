import {createContext, ReactNode, useContext, useMemo} from 'react';
import {CommandBus, InMemoryCommandBus} from '@iotpilot/core/shared/application/bus/command.bus';

const CommandBusContext = createContext<CommandBus | null>(null);

export function CommandBusProvider({ children }: { children: ReactNode }) {
    const commandBus = useMemo(() => {
        const bus = new InMemoryCommandBus();

        // Register device command handlers
        // bus.register(RegisterDeviceCommand, new RegisterDeviceHandler(new PrismaDeviceRepository(prisma)));
        // bus.register(UpdateDeviceCommand, new UpdateDeviceHandler(new PrismaDeviceRepository(prisma)));
        // bus.register(RemoveDeviceCommand, new RemoveDeviceHandler(new PrismaDeviceRepository(prisma)));

        // Register user command handlers
        // bus.register(RegisterUserCommand, new RegisterUserHandler(new PrismaUserRepository(prisma)));
        // bus.register(AuthenticateUserCommand, new AuthenticateUserHandler(new PrismaUserRepository(prisma)));
        // bus.register(LogoutUserCommand, new LogoutUserHandler(new PrismaUserRepository(prisma)));

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

