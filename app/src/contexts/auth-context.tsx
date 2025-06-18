'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedApiClient } from '@/lib/api-client';

interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    createdAt: string;
    _count: {
        devices: number;
        alerts: number;
    };
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string, remember?: boolean) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    apiCall: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const apiClient = AuthenticatedApiClient.getInstance();

    // Setup automatic logout on 401 responses
    useEffect(() => {
        apiClient.setLogoutCallback(() => {
            console.log('🚨 AUTH: Auto-logout triggered by 401 response');
            setUser(null);
            setLoading(false);
        });
    }, [apiClient]);

    // Check authentication status on mount
    useEffect(() => {
        console.log('🔍 AUTH: Initial auth check starting...');
        checkAuth();
    }, []);

    // Debug user state changes
    useEffect(() => {
        console.log('👤 AUTH: User state changed:', user ? `${user.email} (${user.role})` : 'null');
        console.log('⏳ AUTH: Loading state:', loading);
    }, [user, loading]);

    const checkAuth = async () => {
        console.log('🔍 AUTH: checkAuth() called');
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            console.log('📡 AUTH: /api/auth/me response:', response.status, response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ AUTH: User authenticated:', data.user.email);
                setUser(data.user);
            } else if (response.status === 401) {
                console.log('❌ AUTH: Session expired (401)');
                setUser(null);
            } else {
                console.log('❌ AUTH: Auth check failed:', response.status);
                setUser(null);
            }
        } catch (error) {
            console.error('❌ AUTH: Auth check error:', error);
            setUser(null);
        } finally {
            console.log('🏁 AUTH: Setting loading to false');
            setLoading(false);
        }
    };

    const login = async (email: string, password: string, remember = false) => {
        console.log('🔐 AUTH: Login attempt for:', email);

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                remember
            }),
            credentials: 'include'
        });

        const data = await response.json();
        console.log('📡 AUTH: Login response:', response.status, response.ok);

        if (!response.ok) {
            console.log('❌ AUTH: Login failed:', data.error);
            throw new Error(data.error || 'Login failed');
        }

        console.log('✅ AUTH: Login successful, setting user:', data.user.email);
        setUser(data.user);
        setLoading(false);

        // Give React time to update state
        console.log('⏳ AUTH: Waiting for state to propagate...');
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('🔍 AUTH: Final auth state before redirect - User:', user?.email, 'Loading:', loading);
    };

    const logout = async () => {
        console.log('🚪 AUTH: Logout called');
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            console.log('✅ AUTH: Logout API call successful');
        } catch (error) {
            console.error('❌ AUTH: Logout error:', error);
        } finally {
            console.log('🧹 AUTH: Clearing state and redirecting');
            setUser(null);
            setLoading(false);
            window.location.href = '/login';
        }
    };

    const refreshUser = async () => {
        console.log('🔄 AUTH: Manual refresh requested');
        await checkAuth();
    };

    // Authenticated API call method using the interceptor
    const apiCall = (url: string, options?: RequestInit) => {
        return apiClient.fetch(url, options);
    };

    const value: AuthContextType = {
        user,
        loading,
        login,
        logout,
        refreshUser,
        apiCall
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}