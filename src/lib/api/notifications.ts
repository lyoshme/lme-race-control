import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';
import { rowToNotification, notificationToReadUpdate } from './mappers';

/** Последние уведомления пользователя (свежие сверху). */
export async function list(userId: string, limit = 20): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(rowToNotification);
}

/** Отметить одно уведомление прочитанным. */
export async function markRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update(notificationToReadUpdate(true) as never)
    .eq('id', id);

  if (error) throw error;
}

/** Отметить все свои уведомления прочитанными. */
export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update(notificationToReadUpdate(true) as never)
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}
