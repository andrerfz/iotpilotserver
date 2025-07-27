import {createContext, ReactNode, useContext} from 'react';

interface DeviceContextType {
    // Add device-specific context properties here if needed
}

const DeviceContext = createContext<DeviceContextType | null>(null);

export function DeviceContextProvider({ children }: { children: ReactNode }) {
    // Add device-specific state or functionality here if needed
    const value = {};

    return (
        <DeviceContext.Provider value={value}>
            {children}
        </DeviceContext.Provider>
    );
}

export function useDeviceContext() {
    const context = useContext(DeviceContext);
    if (!context) {
        throw new Error('useDeviceContext must be used within DeviceContextProvider');
    }
    return context;
}

