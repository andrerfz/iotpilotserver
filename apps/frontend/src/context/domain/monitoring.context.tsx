import {createContext, ReactNode, useContext} from 'react';

interface MonitoringContextType {
    // Add monitoring-specific context properties here if needed
}

const MonitoringContext = createContext<MonitoringContextType | null>(null);

export function MonitoringContextProvider({ children }: { children: ReactNode }) {
    // Add monitoring-specific state or functionality here if needed
    const value = {};

    return (
        <MonitoringContext.Provider value={value}>
            {children}
        </MonitoringContext.Provider>
    );
}

export function useMonitoringContext() {
    const context = useContext(MonitoringContext);
    if (!context) {
        throw new Error('useMonitoringContext must be used within MonitoringContextProvider');
    }
    return context;
}

