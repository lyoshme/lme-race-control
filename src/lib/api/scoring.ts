import { supabase } from '@/lib/supabase';
import type { ScoringSystem } from '@/types';
import { rowToScoring, scoringToInsert, scoringToUpdate } from './mappers';

export async function list(championshipId: string, seasonId: string): Promise<ScoringSystem[]> {
  const { data, error } = await supabase
    .from('scoring_systems')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToScoring);
}

export async function create(
  s: Omit<ScoringSystem, 'id'>,
): Promise<ScoringSystem> {
  const { data, error } = await supabase
    .from('scoring_systems')
    .insert(scoringToInsert(s) as never)
    .select('*')
    .single();
  if (error) throw error;
  return rowToScoring(data);
}

export async function update(
  id: string,
  patch: Partial<ScoringSystem>,
): Promise<ScoringSystem> {
  const { data, error } = await supabase
    .from('scoring_systems')
    .update(scoringToUpdate(patch) as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToScoring(data);
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('scoring_systems').delete().eq('id', id);
  if (error) throw error;
}
