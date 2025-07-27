import {createContext, ReactNode, useContext, useMemo} from 'react';
import {PrismaDeviceRepository} from '@/lib/device/infrastructure/repositories/prisma-device.repository';
import {PrismaUserRepository} from '@/lib/user/infrastructure/repositories/prisma-user.repository';

interface ServiceContainer {
    deviceRepository: PrismaDeviceRepository;
    userRepository: PrismaUserRepository;
    // Add other services as needed
}

const DependencyInjectionContext = createContext<ServiceContainer | null>(null);

export function DependencyInjectionProvider({ children }: { children: ReactNode }) {
    const container = useMemo(() => ({
        deviceRepository: {
            findById: async () => null,
            findAll: async () => [],
            create: async () => null,
            update: async () => null,
            delete: async () => null,
            findByCriteria: async () => null,
            exists: async () => false,
            deviceMapper: {
                toDomain: () => null,
                toPersistence: () => null,
                toDTO: () => null,
                toListItemDTO: () => null,
                toEntity: () => null,
                fromPersistenceToDomain: () => null,
                fromDomainToPersistence: () => null
            },
            findByName: async () => null,
            findByIpAddress: async () => null,
            findActive: async () => [],
            findByCustomerId: async () => [],
            findByStatus: async () => [],
            findInactive: async () => [],
            save: async () => null
        } as any,
        userRepository: {
            findById: async () => null,
            findAll: async () => [],
            create: async () => null,
            update: async () => null,
            delete: async () => null,
            findByCriteria: async () => null,
            exists: async () => false,
            findByEmail: async () => null,
            findByUsername: async () => null
        } as any,
        // Add other services here
    }), []);

    return (
        <DependencyInjectionContext.Provider value={container}>
            {children}
        </DependencyInjectionContext.Provider>
    );
}

export function useServiceContainer() {
    const context = useContext(DependencyInjectionContext);
    if (!context) {
        throw new Error('useServiceContainer must be used within DependencyInjectionProvider');
    }
    return context;
}

