import { supabase } from '@/lib/supabase';
import type { Driver } from '@/types';
import { driverToInsert, driverToUpdate, rowToDriver } from './mappers';

export async function list(championshipId: string): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('championship_id', championshipId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToDriver);
}

export async function create(d: Omit<Driver, 'id'>): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .insert(driverToInsert(d) as never)
    .select('*')
    .single();
  if (error) throw error;
  return rowToDriver(data);
}

export async function update(id: string, patch: Partial<Driver>): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .update(driverToUpdate(patch) as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToDriver(data);
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('drivers').delete().eq('id', id);
  if (error) throw error;
}

/** Массовое обновление team_id (для DnD пилотов между командами). */
export async function setTeam(driverId: string, teamId: string | null): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({ team_id: teamId } as never)
    .eq('id', driverId);
  if (error) throw error;
}
