import { supabase } from '@/lib/supabase';
import type { Stage } from '@/types';
import { rowToStage, stageToInsert } from './mappers';

export async function list(championshipId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('championship_id', championshipId)
    .order('stage_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToStage);
}

export async function create(s: Omit<Stage, 'id' | 'createdAt'>): Promise<Stage> {
  const { data, error } = await supabase
    .from('stages')
    .insert(stageToInsert(s) as never)
    .select('*')
    .single();
  if (error) throw error;
  return rowToStage(data);
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('stages').delete().eq('id', id);
  if (error) throw error;
}
