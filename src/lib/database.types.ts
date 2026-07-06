/**
 * Типы БД, синхронизированные с supabase/migrations/0001_init.sql.
 * Можно регенерировать через `supabase gen types typescript`, но для MVP
 * держим вручную.
 */
import type { Discipline, StageType } from '@/types';

export type ChampStatus = 'pending' | 'approved' | 'rejected';
export type ChampLifecycle = 'active' | 'finished';

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface ChampionshipRow {
  id: string;
  owner_id: string;
  title: string;
  slogan: string;
  description: string;
  discipline: Discipline;
  discipline_custom: string | null;
  season: string;
  banner_url: string | null;
  lifecycle: ChampLifecycle;
  status: ChampStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeasonRow {
  id: string;
  championship_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface TeamRow {
  id: string;
  championship_id: string;
  season_id: string;
  name: string;
  color: string;
  logo_url: string | null;
  driver_ids: string[];
  created_at: string;
}

export interface DriverRow {
  id: string;
  championship_id: string;
  season_id: string;
  team_id: string | null;
  first_name: string;
  last_name: string;
  number: string;
  country: string;
  photo_url: string | null;
  created_at: string;
}

export interface ScoringSystemRow {
  id: string;
  championship_id: string;
  season_id: string;
  name: string;
  points: number[];
  bonus_pole: number;
  bonus_fastest_lap: number;
  created_at: string;
}

export interface StandingsRow {
  championship_id: string;
  season_id: string;
  initialized: boolean;
  selected_team_ids: string[];
  driver_points: Record<string, { points: number; wins: number; podiums: number }>;
  team_points: Record<string, number>;
  updated_at: string;
}

export interface StageRow {
  id: string;
  championship_id: string;
  season_id: string;
  name: string;
  track: string;
  stage_date: string; // YYYY-MM-DD
  type: StageType;
  scoring_id: string | null;
  participant_ids: string[];
  results: Array<{
    driverId: string;
    teamId: string | null;
    position: number;
    points: number;
    pole?: boolean;
    fastestLap?: boolean;
  }>;
  created_at: string;
}

export interface ChampionshipEditorRow {
  id: string;
  championship_id: string;
  user_id: string;
  can_manage_settings: boolean;
  can_manage_teams: boolean;
  can_manage_scoring: boolean;
  can_manage_stages: boolean;
  created_at: string;
}

export interface ChampionshipInviteRow {
  id: string;
  championship_id: string;
  can_manage_settings: boolean;
  can_manage_teams: boolean;
  can_manage_scoring: boolean;
  can_manage_stages: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; email: string };
        Update: Partial<ProfileRow>;
      };
      championships: {
        Row: ChampionshipRow;
        Insert: Partial<ChampionshipRow> & { title: string };
        Update: Partial<ChampionshipRow>;
      };
      seasons: {
        Row: SeasonRow;
        Insert: Partial<SeasonRow> & { championship_id: string; name: string };
        Update: Partial<SeasonRow>;
      };
      teams: {
        Row: TeamRow;
        Insert: Partial<TeamRow> & { championship_id: string; season_id: string; name: string };
        Update: Partial<TeamRow>;
      };
      drivers: {
        Row: DriverRow;
        Insert: Partial<DriverRow> & {
          championship_id: string;
          season_id: string;
          first_name: string;
          last_name: string;
        };
        Update: Partial<DriverRow>;
      };
      scoring_systems: {
        Row: ScoringSystemRow;
        Insert: Partial<ScoringSystemRow> & { championship_id: string; season_id: string; name: string };
        Update: Partial<ScoringSystemRow>;
      };
      standings: {
        Row: StandingsRow;
        Insert: Partial<StandingsRow> & { championship_id: string; season_id: string };
        Update: Partial<StandingsRow>;
      };
      stages: {
        Row: StageRow;
        Insert: Partial<StageRow> & {
          championship_id: string;
          season_id: string;
          name: string;
          track: string;
          stage_date: string;
        };
        Update: Partial<StageRow>;
      };
      championship_editors: {
        Row: ChampionshipEditorRow;
        Insert: Partial<ChampionshipEditorRow> & { championship_id: string; user_id: string };
        Update: Partial<ChampionshipEditorRow>;
      };
      championship_invites: {
        Row: ChampionshipInviteRow;
        Insert: Partial<ChampionshipInviteRow> & { championship_id: string };
        Update: Partial<ChampionshipInviteRow>;
      };
    };
  };
}
