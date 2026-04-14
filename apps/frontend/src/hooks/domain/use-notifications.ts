import {useEffect, useState} from 'react';
import {useEventBus} from '@/context/providers/event-bus.provider';

interface Notification {
    id: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
}

/**
 * A hook for managing system notifications.
 * @returns An object with notifications array and functions to manage them.
 */
export function useNotifications() {
    const eventBus = useEventBus();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        // Subscribe to alert triggered events
        eventBus.subscribe('AlertTriggeredEvent', async (event: any) => {
            setNotifications(prev => [{
                id: Date.now().toString(), // Generate a unique ID for the notification
                title: 'New Alert',
                message: `Alert triggered for device ${event.deviceId}`,
                severity: (event.severity as any) === 'CRITICAL' ? 'error' : (event.severity as any) === 'WARNING' ? 'warning' : 'info',
                timestamp: new Date(),
                read: false
            }, ...prev.slice(0, 9)]);
        });

        // Additional event subscriptions can be added here
    }, [eventBus]);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => 
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAllNotifications = () => {
        setNotifications([]);
    };

    return {
        notifications,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        unreadCount: notifications.filter(n => !n.read).length
    };
}

