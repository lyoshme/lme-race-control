export type ChampionshipStatus = 'active' | 'finished';
export type ChampionshipModerationStatus = 'pending' | 'approved' | 'rejected';

export type Discipline =
  | 'formula1'
  | 'gt'
  | 'rally'
  | 'karting'
  | 'touring'
  | 'endurance'
  | 'custom';

export interface Championship {
  id: string;
  title: string;
  slogan: string;
  banner: string; // URL (Supabase Storage) или ''
  description: string;
  discipline: Discipline;
  disciplineCustom?: string;
  season: string;
  status: ChampionshipStatus;
  createdAt: number;
  /** Бэкенд-поля (заполняются при чтении из БД) */
  ownerId?: string;
  moderationStatus?: ChampionshipModerationStatus;
  rejectionReason?: string;
  approvedAt?: number;
  isHidden?: boolean;
}

export interface Season {
  id: string;
  championshipId: string;
  name: string;
  isActive: boolean;
  finishedAt: number | null;
  createdAt: number;
  /** Публичная вкладка «Награды» включена (см. миграцию 0070). */
  hasAwards: boolean;
}

export type AwardKind = 'driver' | 'team';

export interface SeasonAward {
  id: string;
  championshipId: string;
  seasonId: string;
  name: string;
  kind: AwardKind;
  winnerDriverId: string | null;
  winnerTeamId: string | null;
  createdAt: number;
}

export interface Team {
  id: string;
  championshipId: string;
  seasonId: string;
  name: string;
  logo: string; // base64 или ''
  color: string; // hex
}

export interface Driver {
  id: string;
  championshipId: string;
  seasonId: string;
  teamId: string | null;
  firstName: string;
  lastName: string;
  number: string; // строкой, чтобы сохранить ведущие нули
  country: string; // ISO код
  photo: string; // base64 или ''
}

export type StageType = 'race' | 'qualifying' | 'sprint';

export interface ScoringSystem {
  id: string;
  championshipId: string;
  seasonId: string;
  name: string;
  points: number[]; // позиция 1 → points[0]
  bonusPole: number;
  bonusFastestLap: number;
}

export interface DriverPointsRow {
  points: number;
  wins: number;
  podiums: number;
}

export interface Standings {
  championshipId: string;
  seasonId: string;
  initialized: boolean;
  selectedTeamIds: string[];
  /** Пилоты, включённые в чемпионат индивидуально (команды нет или не выбрана). */
  selectedDriverIds: string[];
  driverPoints: Record<string, DriverPointsRow>;
  teamPoints: Record<string, number>;
}

export interface StageResultRow {
  driverId: string;
  /**
   * Команда пилота на момент сохранения этапа. Зафиксирована,
   * чтобы откат очков команде был корректным после смены команды.
   * `null` — пилот выступал «без команды» (очки в team standings не идут).
   */
  teamId: string | null;
  position: number;
  points: number;
  pole?: boolean;
  fastestLap?: boolean;
}

export interface Stage {
  id: string;
  championshipId: string;
  seasonId: string;
  name: string;
  track: string;
  date: string; // YYYY-MM-DD
  type: StageType;
  scoringId: string;
  participantIds: string[];
  results: StageResultRow[];
  createdAt: number;
}

export interface ChampionshipEditor {
  id: string;
  championshipId: string;
  userId: string;
  canManageSettings: boolean;
  canManageTeams: boolean;
  canManageScoring: boolean;
  canManageStages: boolean;
  createdAt: number;
  userEmail?: string;
  userDisplayName?: string;
}

export interface ChampionshipInvite {
  id: string;
  championshipId: string;
  canManageSettings: boolean;
  canManageTeams: boolean;
  canManageScoring: boolean;
  canManageStages: boolean;
  createdAt: number;
}

export interface EditorPermissions {
  canManageSettings: boolean;
  canManageTeams: boolean;
  canManageScoring: boolean;
  canManageStages: boolean;
  isOwner: boolean;
}

/* -------------------- Уведомления (миграция 0080) -------------------- */

export type NotificationKind =
  | 'stage_confirmed'
  | 'championship_moderated'
  | 'editor_joined';

export interface Notification {
  id: string;
  userId: string;
  championshipId: string | null;
  kind: NotificationKind;
  /** JSON-полезная нагрузка от триггеров БД; ключи camelCase (см. 0080). */
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: number;
}

export interface OrganizerTokensMap {
  [championshipId: string]: string;
}

/* -------------------- Web Push подписки (миграция 0090) -------------------- */

/** Криптоключи подписки из PushSubscription.getKey(). */
export interface PushKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: PushKeys;
  createdAt: number;
}

/* Справочники */
export interface Country {
  code: string; // ISO 3166-1 alpha-2 (uppercase)
  name: string; // русское название
}

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  formula1: 'Formula 1',
  gt: 'GT Racing',
  rally: 'Ралли',
  karting: 'Картинг',
  touring: 'Кузовные гонки',
  endurance: 'Эндуранс',
  custom: 'Другое',
};

export const STAGE_TYPE_LABELS: Record<StageType, string> = {
  race: 'Гонка',
  qualifying: 'Квалификация',
  sprint: 'Спринт',
};

export const AWARD_KIND_LABELS: Record<AwardKind, string> = {
  driver: 'Пилот',
  team: 'Команда',
};

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  stage_confirmed: 'Этап подтверждён',
  championship_moderated: 'Чемпионат одобрен / отклонён',
  editor_joined: 'Новый со-редактор',
};
