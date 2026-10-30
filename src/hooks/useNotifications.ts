import { useCallback, useMemo } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useAuth } from './useAuth';
import * as api from '@/lib/api';
import type { Notification } from '@/types';

/**
 * Живые уведомления текущего аккаунта.
 *
 * Данные обновляются в реальном времени через Supabase Realtime
 * (переподписка на свою строку таблицы notifications по user_id).
 * Без сессии хук возвращает пустой список — колокол в Header
 * просто не показывается.
 */
export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const fetcher = useCallback(async () => {
    if (!userId) return [] as Notification[];
    return api.notifications.list(userId);
  }, [userId]);

  // Realtime: любой INSERT/UPDATE/DELETE своих строк → переподписка перезапросом.
  const { data, loading, refresh } = useSupabaseQuery(
    fetcher,
    userId ? [{ table: 'notifications', filter: `user_id=eq.${userId}` }] : [],
    [userId],
  );

  const notifications = useMemo(() => data ?? [], [data]);
  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0),
    [notifications],
  );

  return { notifications, unreadCount, loading, refresh };
}
