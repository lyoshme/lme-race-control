import { supabase } from '@/lib/supabase';
import type { ChampionshipEditor, ChampionshipInvite } from '@/types';

/** Список редакторов для указанного чемпионата (с данными профиля). */
export async function list(championshipId: string): Promise<ChampionshipEditor[]> {
  // После RLS-правки 0003 владелец чемпионата не может читать чужие профили
  // напрямую (select с вложенным профилем фильтруется RLS). RPC
  // list_championship_editors (миграция 0040) даёт скоупированный доступ:
  // профили только редакторов этого чемпионата, только для его владельца/админа.
  const { data, error } = await supabase.rpc('list_championship_editors', {
    cid: championshipId,
  } as never);

  if (error) throw error;

  type EditorRow = {
    user_id: string;
    can_manage_settings: boolean;
    can_manage_teams: boolean;
    can_manage_scoring: boolean;
    can_manage_stages: boolean;
    created_at: string;
    email: string | null;
    display_name: string | null;
  };

  return ((data ?? []) as EditorRow[]).map((row) => ({
    id: row.user_id,
    championshipId,
    userId: row.user_id,
    canManageSettings: row.can_manage_settings,
    canManageTeams: row.can_manage_teams,
    canManageScoring: row.can_manage_scoring,
    canManageStages: row.can_manage_stages,
    createdAt: new Date(row.created_at).getTime(),
    userEmail: row.email ?? undefined,
    userDisplayName: row.display_name ?? undefined,
  }));
}

/** Получение прав редактора для конкретного пользователя. */
export async function getEditorRecord(
  championshipId: string,
  userId: string,
): Promise<ChampionshipEditor | null> {
  const { data, error } = await supabase
    .from('championship_editors')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as any;
  return {
    id: row.id,
    championshipId: row.championship_id,
    userId: row.user_id,
    canManageSettings: row.can_manage_settings,
    canManageTeams: row.can_manage_teams,
    canManageScoring: row.can_manage_scoring,
    canManageStages: row.can_manage_stages,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** Обновление прав редактора. */
export async function updatePermissions(
  championshipId: string,
  userId: string,
  patch: Partial<Omit<ChampionshipEditor, 'id' | 'championshipId' | 'userId' | 'createdAt'>>,
): Promise<void> {
  const payload: any = {};
  if (patch.canManageSettings !== undefined) payload.can_manage_settings = patch.canManageSettings;
  if (patch.canManageTeams !== undefined) payload.can_manage_teams = patch.canManageTeams;
  if (patch.canManageScoring !== undefined) payload.can_manage_scoring = patch.canManageScoring;
  if (patch.canManageStages !== undefined) payload.can_manage_stages = patch.canManageStages;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = await db
    .from('championship_editors')
    .update(payload)
    .eq('championship_id', championshipId)
    .eq('user_id', userId);

  if (error) throw error;
}

/** Удаление редактора из чемпионата. */
export async function remove(championshipId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('championship_editors')
    .delete()
    .eq('championship_id', championshipId)
    .eq('user_id', userId);

  if (error) throw error;
}

/** Создание ссылки/токена приглашения. */
export async function createInvite(
  championshipId: string,
  permissions: Omit<ChampionshipInvite, 'id' | 'championshipId' | 'createdAt'>,
): Promise<ChampionshipInvite> {
  const { data, error } = await supabase
    .from('championship_invites')
    .insert({
      championship_id: championshipId,
      can_manage_settings: permissions.canManageSettings,
      can_manage_teams: permissions.canManageTeams,
      can_manage_scoring: permissions.canManageScoring,
      can_manage_stages: permissions.canManageStages,
    } as any)
    .select('*')
    .single();

  if (error) throw error;
  const row = data as any;
  return {
    id: row.id,
    championshipId: row.championship_id,
    canManageSettings: row.can_manage_settings,
    canManageTeams: row.can_manage_teams,
    canManageScoring: row.can_manage_scoring,
    canManageStages: row.can_manage_stages,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** Получение инвайта по ID (с названием чемпионата). */
export async function getInvite(
  inviteId: string,
): Promise<(ChampionshipInvite & { championshipTitle: string }) | null> {
  const { data, error } = await supabase
    .from('championship_invites')
    .select(`
      *,
      championship:championships(title)
    `)
    .eq('id', inviteId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as any;
  return {
    id: row.id,
    championshipId: row.championship_id,
    canManageSettings: row.can_manage_settings,
    canManageTeams: row.can_manage_teams,
    canManageScoring: row.can_manage_scoring,
    canManageStages: row.can_manage_stages,
    createdAt: new Date(row.created_at).getTime(),
    championshipTitle: row.championship?.title || 'Без названия',
  };
}

/** Активация инвайта через RPC. Возвращает ID чемпионата в случае успеха. */
export async function acceptInvite(inviteId: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_championship_invite', {
    invite_id: inviteId,
  } as any);

  if (error) throw error;
  return data;
}
