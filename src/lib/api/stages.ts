import { supabase } from '@/lib/supabase';
import type { Stage } from '@/types';
import { rowToStage } from './mappers';

export async function list(championshipId: string, seasonId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .order('stage_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToStage);
}

/**
 * Создаёт этап и применяет его очки к standings в ОДНОЙ транзакции БД
 * (RPC confirm_stage). Раньше это были два независимых запроса — при сбое
 * второго этап оставался без очков, а параллельные подтверждения двух
 * редакторов могли перезаписать друг друга.
 */
export async function confirm(s: Omit<Stage, 'id' | 'createdAt'>): Promise<Stage> {
  const { data: newId, error } = await supabase.rpc('confirm_stage', {
    champ_id: s.championshipId,
    season_id: s.seasonId,
    stage_name: s.name,
    stage_track: s.track,
    stage_date: s.date,
    stage_type: s.type,
    scoring_id: s.scoringId || null,
    participant_ids: s.participantIds,
    results: s.results,
  } as never);
  if (error) throw error;
  // Локальный объект для тоста/навигации; авторитетные данные придут по realtime.
  return { ...s, id: newId as string, createdAt: Date.now() };
}

/**
 * Удаляет этап и откатывает его очки из standings в ОДНОЙ транзакции БД
 * (RPC delete_stage). Идемпотентно: повторное удаление несуществующего этапа
 * не является ошибкой — двойной откат очков невозможен.
 */
export async function remove(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_stage', { stage_id: id } as never);
  if (error) throw error;
}
