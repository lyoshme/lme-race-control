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
}

export interface Team {
  id: string;
  championshipId: string;
  name: string;
  logo: string; // base64 или ''
  color: string; // hex
  driverIds: string[];
}

export interface Driver {
  id: string;
  championshipId: string;
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
  initialized: boolean;
  selectedTeamIds: string[];
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
  name: string;
  track: string;
  date: string; // YYYY-MM-DD
  type: StageType;
  scoringId: string;
  participantIds: string[];
  results: StageResultRow[];
  createdAt: number;
}

export interface OrganizerTokensMap {
  [championshipId: string]: string;
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
