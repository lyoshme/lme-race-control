/**
 * snake_case (БД) ↔ camelCase (домен).
 * Все фичи работают с доменными типами, а API-слой делает конвертацию.
 */
import type {
  Championship,
  Driver,
  ScoringSystem,
  Season,
  Stage,
  StageResultRow,
  Standings,
  Team,
} from '@/types';
import type {
  ChampionshipRow,
  DriverRow,
  ScoringSystemRow,
  SeasonRow,
  StageRow,
  StandingsRow,
  TeamRow,
} from '@/lib/database.types';

/* -------------------- Championship -------------------- */
export function rowToChampionship(r: ChampionshipRow): Championship {
  return {
    id: r.id,
    title: r.title,
    slogan: r.slogan,
    description: r.description,
    discipline: r.discipline,
    disciplineCustom: r.discipline_custom ?? undefined,
    season: r.season,
    banner: r.banner_url ?? '',
    status: r.lifecycle,
    createdAt: new Date(r.created_at).getTime(),
    ownerId: r.owner_id,
    moderationStatus: r.status,
    rejectionReason: r.rejection_reason ?? undefined,
    approvedAt: r.approved_at ? new Date(r.approved_at).getTime() : undefined,
    isHidden: r.is_hidden ?? false,
  };
}

export function championshipToInsert(
  c: Pick<
    Championship,
    'title' | 'slogan' | 'description' | 'discipline' | 'season' | 'banner'
  > & {
    disciplineCustom?: string;
  },
): Partial<ChampionshipRow> {
  return {
    title: c.title,
    slogan: c.slogan,
    description: c.description,
    discipline: c.discipline,
    discipline_custom: c.disciplineCustom ?? null,
    season: c.season,
    banner_url: c.banner || null,
  };
}

export function championshipToUpdate(
  patch: Partial<Championship>,
): Partial<ChampionshipRow> {
  const out: Partial<ChampionshipRow> = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.slogan !== undefined) out.slogan = patch.slogan;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.discipline !== undefined) out.discipline = patch.discipline;
  if (patch.disciplineCustom !== undefined)
    out.discipline_custom = patch.disciplineCustom || null;
  if (patch.season !== undefined) out.season = patch.season;
  if (patch.banner !== undefined) out.banner_url = patch.banner || null;
  if (patch.status !== undefined) out.lifecycle = patch.status;
  if (patch.isHidden !== undefined) out.is_hidden = patch.isHidden;
  return out;
}

/* -------------------- Season -------------------- */
export function rowToSeason(r: SeasonRow): Season {
  return {
    id: r.id,
    championshipId: r.championship_id,
    name: r.name,
    isActive: r.is_active,
    createdAt: new Date(r.created_at).getTime(),
  };
}

export function seasonToInsert(s: { championshipId: string; name: string }): Partial<SeasonRow> {
  return {
    championship_id: s.championshipId,
    name: s.name,
    is_active: true,
  };
}

/* -------------------- Team -------------------- */
export function rowToTeam(r: TeamRow): Team {
  return {
    id: r.id,
    championshipId: r.championship_id,
    seasonId: r.season_id,
    name: r.name,
    color: r.color,
    logo: r.logo_url ?? '',
    driverIds: r.driver_ids ?? [],
  };
}

export function teamToInsert(t: Omit<Team, 'id'>): Partial<TeamRow> {
  return {
    championship_id: t.championshipId,
    season_id: t.seasonId,
    name: t.name,
    color: t.color,
    logo_url: t.logo || null,
    driver_ids: t.driverIds ?? [],
  };
}

export function teamToUpdate(patch: Partial<Team>): Partial<TeamRow> {
  const out: Partial<TeamRow> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.color !== undefined) out.color = patch.color;
  if (patch.logo !== undefined) out.logo_url = patch.logo || null;
  if (patch.driverIds !== undefined) out.driver_ids = patch.driverIds;
  return out;
}

/* -------------------- Driver -------------------- */
export function rowToDriver(r: DriverRow): Driver {
  return {
    id: r.id,
    championshipId: r.championship_id,
    seasonId: r.season_id,
    teamId: r.team_id,
    firstName: r.first_name,
    lastName: r.last_name,
    number: r.number,
    country: r.country,
    photo: r.photo_url ?? '',
  };
}

export function driverToInsert(d: Omit<Driver, 'id'>): Partial<DriverRow> {
  return {
    championship_id: d.championshipId,
    season_id: d.seasonId,
    team_id: d.teamId,
    first_name: d.firstName,
    last_name: d.lastName,
    number: d.number,
    country: d.country,
    photo_url: d.photo || null,
  };
}

export function driverToUpdate(patch: Partial<Driver>): Partial<DriverRow> {
  const out: Partial<DriverRow> = {};
  if (patch.teamId !== undefined) out.team_id = patch.teamId;
  if (patch.firstName !== undefined) out.first_name = patch.firstName;
  if (patch.lastName !== undefined) out.last_name = patch.lastName;
  if (patch.number !== undefined) out.number = patch.number;
  if (patch.country !== undefined) out.country = patch.country;
  if (patch.photo !== undefined) out.photo_url = patch.photo || null;
  return out;
}

/* -------------------- ScoringSystem -------------------- */
export function rowToScoring(r: ScoringSystemRow): ScoringSystem {
  return {
    id: r.id,
    championshipId: r.championship_id,
    seasonId: r.season_id,
    name: r.name,
    points: r.points ?? [],
    bonusPole: r.bonus_pole ?? 0,
    bonusFastestLap: r.bonus_fastest_lap ?? 0,
  };
}

export function scoringToInsert(
  s: Omit<ScoringSystem, 'id'>,
): Partial<ScoringSystemRow> {
  return {
    championship_id: s.championshipId,
    season_id: s.seasonId,
    name: s.name,
    points: s.points,
    bonus_pole: s.bonusPole,
    bonus_fastest_lap: s.bonusFastestLap,
  };
}

export function scoringToUpdate(
  patch: Partial<ScoringSystem>,
): Partial<ScoringSystemRow> {
  const out: Partial<ScoringSystemRow> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.points !== undefined) out.points = patch.points;
  if (patch.bonusPole !== undefined) out.bonus_pole = patch.bonusPole;
  if (patch.bonusFastestLap !== undefined)
    out.bonus_fastest_lap = patch.bonusFastestLap;
  return out;
}

/* -------------------- Standings -------------------- */
export function rowToStandings(r: StandingsRow): Standings {
  return {
    championshipId: r.championship_id,
    seasonId: r.season_id,
    initialized: r.initialized,
    selectedTeamIds: r.selected_team_ids ?? [],
    driverPoints: r.driver_points ?? {},
    teamPoints: r.team_points ?? {},
  };
}

export function standingsToUpsert(s: Standings): Partial<StandingsRow> {
  return {
    championship_id: s.championshipId,
    season_id: s.seasonId,
    initialized: s.initialized,
    selected_team_ids: s.selectedTeamIds,
    driver_points: s.driverPoints,
    team_points: s.teamPoints,
  };
}

/* -------------------- Stage -------------------- */
export function rowToStage(r: StageRow): Stage {
  return {
    id: r.id,
    championshipId: r.championship_id,
    seasonId: r.season_id,
    name: r.name,
    track: r.track,
    date: r.stage_date,
    type: r.type,
    scoringId: r.scoring_id ?? '',
    participantIds: r.participant_ids ?? [],
    results: (r.results ?? []) as StageResultRow[],
    createdAt: new Date(r.created_at).getTime(),
  };
}

export function stageToInsert(s: Omit<Stage, 'id' | 'createdAt'>): Partial<StageRow> {
  return {
    championship_id: s.championshipId,
    season_id: s.seasonId,
    name: s.name,
    track: s.track,
    stage_date: s.date,
    type: s.type,
    scoring_id: s.scoringId || null,
    participant_ids: s.participantIds,
    results: s.results,
  };
}
