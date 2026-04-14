import { useCallback, useState } from 'react';
import { useQuery } from './use-query';
import { apiUrl } from '@/utils/api-url';

interface NotificationHistoryParams {
  userId?: string;
  type?: string;
  channel?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

interface NotificationRecord {
  id: string;
  userId: string | null;
  type: string;
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  attemptCount: number;
  sourceEventId: string;
  sourceEntityId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedNotifications {
  records: NotificationRecord[];
  total: number;
  page: number;
  limit: number;
}

interface NotificationPreference {
  id: string;
  userId: string;
  channel: string;
  notificationType: string;
  enabled: boolean;
  destination: string | null;
}

export function useNotificationQueries() {
  const historyQuery = useQuery<NotificationHistoryParams, PaginatedNotifications>('/api/notifications');

  const [record, setRecord] = useState<NotificationRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  const getNotificationRecord = useCallback(async (id: string): Promise<NotificationRecord | null> => {
    setRecordLoading(true);
    setRecordError(null);
    try {
      const res = await fetch(apiUrl(`/api/notifications/${id}`), { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch notification: ${res.status}`);
      const body = await res.json();
      const data = (body.data ?? body) as NotificationRecord;
      setRecord(data);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch notification';
      setRecordError(msg);
      return null;
    } finally {
      setRecordLoading(false);
    }
  }, []);

  const getUserPreferences = useCallback(async (userId: string): Promise<NotificationPreference[]> => {
    setPrefsLoading(true);
    setPrefsError(null);
    try {
      const res = await fetch(apiUrl(`/api/users/${userId}/notification-preferences`), { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch preferences: ${res.status}`);
      const body = await res.json();
      const data = (body.data ?? body) as NotificationPreference[];
      setPreferences(data);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch preferences';
      setPrefsError(msg);
      return [];
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  return {
    getNotificationHistory: historyQuery.execute,
    getNotificationRecord,
    getUserPreferences,
    historyData: historyQuery.data,
    record,
    preferences,
    loading: historyQuery.loading || recordLoading || prefsLoading,
    error: historyQuery.error || recordError || prefsError,
  };
}
