import {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {useQueryBus} from '@/context/providers/query-bus.provider';

interface UserContextType {
    isAuthenticated: boolean;
    user: { id: string; email: string; role: string; customerId: string } | null;
    loading: boolean;
    checkSession: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserContextProvider({ children }: { children: ReactNode }) {
    const queryBus = useQueryBus();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<{ id: string; email: string; role: string; customerId: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const checkSession = async () => {
        try {
            setLoading(true);
            // Assuming token is stored in cookies or localStorage, or passed somehow
            const token = document.cookie.split('; ').find(row => row.startsWith('auth-token='))?.split('=')[1] || '';
            if (token) {
                // Temporarily comment out due to private constructor
                // const query = new ValidateSessionQuery(token);
                // const result = await queryBus.execute(query);
                // if (result.valid && result.user) {
                //     setIsAuthenticated(true);
                //     setUser(result.user);
                // } else {
                //     setIsAuthenticated(false);
                //     setUser(null);
                // }
                // Use a placeholder or alternative approach
                setIsAuthenticated(false);
                setUser(null);
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        } catch (error) {
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const value = {
        isAuthenticated,
        user,
        loading,
        checkSession
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUserContext() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within UserContextProvider');
    }
    return context;
}

