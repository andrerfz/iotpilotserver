'use client';

import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {useAuth} from '@/contexts/auth-context';

type Theme = 'light' | 'dark' | 'system';
type DashboardLayout = 'default' | 'compact' | 'expanded';

interface UserPreferences {
    // SYSTEM
    theme: Theme;
    dashboardLayout: DashboardLayout;
    itemsPerPage: number;
    // PROFILE
    language: string;
    timezone: string;
    dateFormat: string;
    // NOTIFICATIONS
    emailNotifications: boolean;
    alertNotifications: boolean;
    deviceOfflineNotifications: boolean;
    pushNotifications: boolean;
}

interface UserPreferencesContextType {
    preferences: UserPreferences;
    loaded: boolean;
    setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}

const DEFAULTS: UserPreferences = {
    theme: 'light',
    dashboardLayout: 'default',
    itemsPerPage: 10,
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    emailNotifications: true,
    alertNotifications: true,
    deviceOfflineNotifications: true,
    pushNotifications: false,
};

const UserPreferencesContext = createContext<UserPreferencesContextType>({
    preferences: DEFAULTS,
    loaded: false,
    setPreference: () => {},
});

export function useUserPreferences() {
    return useContext(UserPreferencesContext);
}

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else if (theme === 'light') {
        root.classList.remove('dark');
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
    }
}

export function UserPreferencesProvider({children}: {children: React.ReactNode}) {
    const {user, apiCall} = useAuth();
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULTS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user) {
            setPreferences(DEFAULTS);
            setLoaded(false);
            return;
        }

        async function load() {
            try {
                const res = await apiCall('/api/settings');
                if (!res.ok) return;
                const body = await res.json();
                const data = body.data ?? body;

                const system = data.SYSTEM ?? {};
                const profile = data.PROFILE ?? {};
                const notifications = data.NOTIFICATIONS ?? {};

                setPreferences({
                    theme: (['light', 'dark', 'system'].includes(system.theme) ? system.theme : 'light') as Theme,
                    dashboardLayout: (['default', 'compact', 'expanded'].includes(system.dashboardLayout)
                        ? system.dashboardLayout : 'default') as DashboardLayout,
                    itemsPerPage: Number(system.itemsPerPage) || 10,
                    language: profile.language || 'en',
                    timezone: profile.timezone || 'UTC',
                    dateFormat: profile.dateFormat || 'MM/DD/YYYY',
                    emailNotifications: (notifications.emailNotifications ?? 'true') === 'true',
                    alertNotifications: (notifications.alertNotifications ?? 'true') === 'true',
                    deviceOfflineNotifications: (notifications.deviceOfflineNotifications ?? 'true') === 'true',
                    pushNotifications: (notifications.pushNotifications ?? 'false') === 'true',
                });
            } catch {
                // non-fatal — use defaults
            } finally {
                setLoaded(true);
            }
        }

        load();
    }, [user, apiCall]);

    // Apply theme to <html> whenever it changes
    useEffect(() => {
        if (loaded) applyTheme(preferences.theme);
    }, [preferences.theme, loaded]);

    const setPreference = useCallback(<K extends keyof UserPreferences>(
        key: K,
        value: UserPreferences[K]
    ) => {
        setPreferences(prev => {
            const next = {...prev, [key]: value};
            if (key === 'theme') applyTheme(value as Theme);
            return next;
        });
    }, []);

    return (
        <UserPreferencesContext.Provider value={{preferences, loaded, setPreference}}>
            {children}
        </UserPreferencesContext.Provider>
    );
}
