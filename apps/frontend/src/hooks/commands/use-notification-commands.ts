import { useCallback, useState } from 'react';
import { apiUrl } from '@/utils/api-url';

interface UpdatePreferencePayload {
  channel: string;
  notificationType: string;
  enabled: boolean;
  destination?: string | null;
}

export function useNotificationCommands() {
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [updatePrefsLoading, setUpdatePrefsLoading] = useState(false);
  const [updatePrefsError, setUpdatePrefsError] = useState<string | null>(null);

  const retryNotification = useCallback(async (id: string): Promise<boolean> => {
    setRetryLoading(true);
    setRetryError(null);
    try {
      const res = await fetch(apiUrl(`/api/notifications/${id}/retry`), {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Retry failed: ${res.status}`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to retry notification';
      setRetryError(msg);
      return false;
    } finally {
      setRetryLoading(false);
    }
  }, []);

  const cancelNotification = useCallback(async (id: string): Promise<boolean> => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch(apiUrl(`/api/notifications/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Cancel failed: ${res.status}`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to cancel notification';
      setCancelError(msg);
      return false;
    } finally {
      setCancelLoading(false);
    }
  }, []);

  const updateNotificationPreference = useCallback(async (
    userId: string,
    payload: UpdatePreferencePayload,
  ): Promise<boolean> => {
    setUpdatePrefsLoading(true);
    setUpdatePrefsError(null);
    try {
      const res = await fetch(apiUrl(`/api/users/${userId}/notification-preferences`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Update preference failed: ${res.status}`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update preference';
      setUpdatePrefsError(msg);
      return false;
    } finally {
      setUpdatePrefsLoading(false);
    }
  }, []);

  return {
    retryNotification,
    cancelNotification,
    updateNotificationPreference,
    retryLoading,
    cancelLoading,
    updatePrefsLoading,
    retryError,
    cancelError,
    updatePrefsError,
  };
}
