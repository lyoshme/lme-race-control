/**
 * snake_case (БД) ↔ camelCase (домен).
 * Все фичи работают с доменными типами, а API-слой делает конвертацию.
 */
import type {
  Championship,
  Driver,
  ScoringSystem,
  Season,
  SeasonAward,
  Stage,
  StageResultRow,
  Standings,
  Team,
  Notification,
  PushSubscription,
} from '@/types';
import type {
  ChampionshipRow,
  DriverRow,
  ScoringSystemRow,
  SeasonRow,
  SeasonAwardRow,
  StageRow,
  StandingsRow,
  TeamRow,
  NotificationRow,
  PushSubscriptionRow,
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
    finishedAt: r.finished_at ? new Date(r.finished_at).getTime() : null,
    createdAt: new Date(r.created_at).getTime(),
    hasAwards: r.has_awards ?? false,
  };
}

export function seasonToInsert(s: { championshipId: string; name: string }): Partial<SeasonRow> {
  return {
    championship_id: s.championshipId,
    name: s.name,
    is_active: true,
  };
}

/* -------------------- SeasonAward -------------------- */
export function rowToSeasonAward(r: SeasonAwardRow): SeasonAward {
  return {
    id: r.id,
    championshipId: r.championship_id,
    seasonId: r.season_id,
    name: r.name,
    kind: r.kind,
    winnerDriverId: r.winner_driver_id ?? null,
    winnerTeamId: r.winner_team_id ?? null,
    createdAt: new Date(r.created_at).getTime(),
  };
}

export function seasonAwardToInsert(
  a: Omit<SeasonAward, 'id' | 'createdAt'>,
): Partial<SeasonAwardRow> {
  return {
    championship_id: a.championshipId,
    season_id: a.seasonId,
    name: a.name,
    kind: a.kind,
    winner_driver_id: a.winnerDriverId ?? null,
    winner_team_id: a.winnerTeamId ?? null,
  };
}

export function seasonAwardToUpdate(patch: Partial<SeasonAward>): Partial<SeasonAwardRow> {
  const out: Partial<SeasonAwardRow> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.kind !== undefined) out.kind = patch.kind;
  if (patch.winnerDriverId !== undefined)
    out.winner_driver_id = patch.winnerDriverId ?? null;
  if (patch.winnerTeamId !== undefined)
    out.winner_team_id = patch.winnerTeamId ?? null;
  return out;
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
  };
}

export function teamToInsert(t: Omit<Team, 'id'>): Partial<TeamRow> {
  return {
    championship_id: t.championshipId,
    season_id: t.seasonId,
    name: t.name,
    color: t.color,
    logo_url: t.logo || null,
  };
}

export function teamToUpdate(patch: Partial<Team>): Partial<TeamRow> {
  const out: Partial<TeamRow> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.color !== undefined) out.color = patch.color;
  if (patch.logo !== undefined) out.logo_url = patch.logo || null;
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
    selectedDriverIds: r.selected_driver_ids ?? [],
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
    selected_driver_ids: s.selectedDriverIds,
    driver_points: s.driverPoints,
    team_points: s.teamPoints,
  };
}

/* -------------------- Notification (миграция 0080) -------------------- */
export function rowToNotification(r: NotificationRow): Notification {
  return {
    id: r.id,
    userId: r.user_id,
    championshipId: r.championship_id,
    kind: r.kind,
    payload: r.payload ?? {},
    isRead: r.is_read,
    createdAt: new Date(r.created_at).getTime(),
  };
}

/** Патч «отметить прочитано/непрочитано» (клиент меняет только is_read). */
export function notificationToReadUpdate(isRead: boolean): Partial<NotificationRow> {
  return { is_read: isRead };
}

/* -------------------- PushSubscription (миграция 0090) -------------------- */
export function rowToPushSubscription(r: PushSubscriptionRow): PushSubscription {
  return {
    id: r.id,
    userId: r.user_id,
    endpoint: r.endpoint,
    keys: r.keys,
    createdAt: new Date(r.created_at).getTime(),
  };
}

export function pushSubscriptionToInsert(
  s: Pick<PushSubscription, 'userId' | 'endpoint' | 'keys'>,
): Partial<PushSubscriptionRow> {
  return {
    user_id: s.userId,
    endpoint: s.endpoint,
    keys: s.keys,
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
