import { supabase } from '@/lib/supabase';
import type { Standings } from '@/types';
import { rowToStandings, standingsToUpsert } from './mappers';

export async function get(championshipId: string, seasonId: string): Promise<Standings | null> {
  const { data, error } = await supabase
    .from('standings')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStandings(data) : null;
}

export async function upsert(s: Standings): Promise<Standings> {
  const { data, error } = await supabase
    .from('standings')
    .upsert(standingsToUpsert(s) as never, { onConflict: 'championship_id,season_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToStandings(data);
}

export async function remove(championshipId: string, seasonId: string): Promise<void> {
  const { error } = await supabase
    .from('standings')
    .delete()
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId);
  if (error) throw error;
}
