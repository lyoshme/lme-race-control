import { supabase } from '@/lib/supabase';
import type { Team } from '@/types';
import { rowToTeam, teamToInsert, teamToUpdate } from './mappers';

export async function list(championshipId: string, seasonId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToTeam);
}

export async function create(t: Omit<Team, 'id'>): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert(teamToInsert(t) as never)
    .select('*')
    .single();
  if (error) throw error;
  return rowToTeam(data);
}

export async function update(id: string, patch: Partial<Team>): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update(teamToUpdate(patch) as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToTeam(data);
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;
}
