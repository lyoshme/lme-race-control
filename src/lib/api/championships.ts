import { supabase } from '@/lib/supabase';
import type { Championship, ChampionshipModerationStatus } from '@/types';
import {
  championshipToInsert,
  championshipToUpdate,
  rowToChampionship,
} from './mappers';

/** Список approved-чемпионатов (публичная лента). */
export async function listApproved(): Promise<Championship[]> {
  const { data, error } = await supabase
    .from('championships')
    .select('*')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToChampionship);
}

/** Чемпионаты текущего пользователя (любой статус). */
export async function listMine(ownerId: string): Promise<Championship[]> {
  const { data, error } = await supabase
    .from('championships')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToChampionship);
}

/** Список pending для админ-панели. */
export async function listByStatus(
  status: ChampionshipModerationStatus,
): Promise<Championship[]> {
  const { data, error } = await supabase
    .from('championships')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToChampionship);
}

export async function getById(id: string): Promise<Championship | null> {
  const { data, error } = await supabase
    .from('championships')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToChampionship(data) : null;
}

export async function create(
  c: Pick<
    Championship,
    'title' | 'slogan' | 'description' | 'discipline' | 'season' | 'banner'
  > & { disciplineCustom?: string },
): Promise<Championship> {
  const payload = championshipToInsert(c);
  // owner_id и status='pending' проставляются триггером
  const { data, error } = await supabase
    .from('championships')
    .insert(payload as never)
    .select('*')
    .single();
  if (error) throw error;
  return rowToChampionship(data);
}

export async function update(
  id: string,
  patch: Partial<Championship>,
): Promise<Championship> {
  const { data, error } = await supabase
    .from('championships')
    .update(championshipToUpdate(patch) as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToChampionship(data);
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('championships').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- модерация (только админ) ---------- */
export async function approve(id: string): Promise<Championship> {
  const { data, error } = await supabase
    .from('championships')
    .update({ status: 'approved', rejection_reason: null } as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToChampionship(data);
}

export async function reject(id: string, reason: string): Promise<Championship> {
  const { data, error } = await supabase
    .from('championships')
    .update({ status: 'rejected', rejection_reason: reason } as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToChampionship(data);
}
