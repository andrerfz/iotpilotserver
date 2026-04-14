import {ReactNode} from 'react';
import {DDDProvider} from './ddd.context';

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
    return (
        <DDDProvider>
            {children}
        </DDDProvider>
    );
}