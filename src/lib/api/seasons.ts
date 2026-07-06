import { supabase } from '@/lib/supabase';
import type { Season } from '@/types';
import { rowToSeason, seasonToInsert } from './mappers';

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
  const { data, error } = await supabase
    .from('seasons')
    .insert(seasonToInsert({ championshipId, name }) as never)
    .select('*')
    .single();
  if (error) throw error;
  return rowToSeason(data);
}

export async function setActive(id: string, championshipId: string): Promise<void> {
  await supabase
    .from('seasons')
    .update({ is_active: false } as never)
    .eq('championship_id', championshipId);

  const { error } = await supabase
    .from('seasons')
    .update({ is_active: true } as never)
    .eq('id', id);
  if (error) throw error;
}

export async function update(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('seasons')
    .update({ name } as never)
    .eq('id', id);
  if (error) throw error;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('seasons').delete().eq('id', id);
  if (error) throw error;
}
