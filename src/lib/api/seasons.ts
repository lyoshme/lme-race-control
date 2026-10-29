import { supabase } from '@/lib/supabase';
import type { Season } from '@/types';
import { rowToSeason } from './mappers';

export async function list(championshipId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('championship_id', championshipId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToSeason);
}

export async function create(championshipId: string, name: string): Promise<Season> {
  // Одна транзакция в БД (RPC): деактивирует текущий активный сезон
  // и создаёт новый активный. Раньше это были два независимых запроса —
  // сбой между ними оставлял чемпионат без активного сезона.
  const { data: newId, error } = await supabase.rpc('create_season', {
    champ_id: championshipId,
    season_name: name,
  } as never);
  if (error) throw error;
  const seasons = await list(championshipId);
  const created = seasons.find((s) => s.id === (newId as string));
  if (!created) throw new Error('Сезон создан, но не найден в списке');
  return created;
}

export async function setActive(id: string, championshipId: string): Promise<void> {
  // championshipId RPC не нужен (определяется по id сезона) —
  // оставлен для совместимости существующих вызовов.
  const { error } = await supabase.rpc('set_active_season', { season_id: id } as never);
  if (error) throw error;
}

export async function update(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('seasons')
    .update({ name } as never)
    .eq('id', id);
  if (error) throw error;
}

export async function finish(id: string): Promise<void> {
  const { error } = await supabase
    .from('seasons')
    .update({ is_active: false, finished_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw error;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('seasons').delete().eq('id', id);
  if (error) throw error;
}

export async function setAwardsEnabled(id: string, enabled: boolean): Promise<void> {
  // Переключение публичной вкладки «Награды» для сезона (RLS seasons_write:
  // has_championship_permission(..., 'settings')).
  const { error } = await supabase
    .from('seasons')
    .update({ has_awards: enabled } as never)
    .eq('id', id);
  if (error) throw error;
}
