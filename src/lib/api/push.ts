import { supabase } from '@/lib/supabase';
import type { PushKeys, PushSubscription } from '@/types';
import { pushSubscriptionToInsert, rowToPushSubscription } from './mappers';

/**
 * Зарегистрировать (или перезаписать) подписку устройства.
 * Один endpoint = одна строка: при повторной подписке старая запись
 * для этого браузера удаляется, вставляется свежая (криптоключи ротируются).
 */
export async function subscribe(
  userId: string,
  endpoint: string,
  keys: PushKeys,
): Promise<PushSubscription> {
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert(pushSubscriptionToInsert({ userId, endpoint, keys }) as never)
    .select('*')
    .single();

  if (error) throw error;
  return rowToPushSubscription(data);
}

/** Удалить подписку (браузер отписался или пользователь выключил push). */
export async function unsubscribe(endpoint: string): Promise<void> {
  // RLS разрешает удаление только своих строк — чужой endpoint молча не тронется.
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) throw error;
}
