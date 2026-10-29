import { supabase } from '@/lib/supabase';
import type { SeasonAward, AwardKind } from '@/types';
import { rowToSeasonAward, seasonAwardToInsert, seasonAwardToUpdate } from './mappers';

export async function list(
  championshipId: string,
  seasonId: string,
): Promise<SeasonAward[]> {
  const { data, error } = await supabase
    .from('season_awards')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToSeasonAward);
}

export async function create(
  a: {
    championshipId: string;
    seasonId: string;
    name: string;
    kind: AwardKind;
    winnerDriverId?: string | null;
    winnerTeamId?: string | null;
  },
): Promise<SeasonAward> {
  const { data, error } = await supabase
    .from('season_awards')
    .insert(
      seasonAwardToInsert({
        championshipId: a.championshipId,
        seasonId: a.seasonId,
        name: a.name,
        kind: a.kind,
        winnerDriverId: a.winnerDriverId ?? null,
        winnerTeamId: a.winnerTeamId ?? null,
      }) as never,
    )
    .select('*')
    .single();
  if (error) throw error;
  return rowToSeasonAward(data as never);
}

export async function update(
  id: string,
  patch: {
    name?: string;
    kind?: AwardKind;
    winnerDriverId?: string | null;
    winnerTeamId?: string | null;
  },
): Promise<SeasonAward> {
  const { data, error } = await supabase
    .from('season_awards')
    .update(seasonAwardToUpdate({
      name: patch.name,
      kind: patch.kind,
      winnerDriverId: patch.winnerDriverId,
      winnerTeamId: patch.winnerTeamId,
    }) as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToSeasonAward(data as never);
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('season_awards').delete().eq('id', id);
  if (error) throw error;
}
