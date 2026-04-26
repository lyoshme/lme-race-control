/**
 * Доменный слой над storage: типизированные get/set по ключам.
 * Все ключи в одном месте — проще аудит.
 */
import { storage } from './storage';
import type {
  Championship,
  Driver,
  OrganizerTokensMap,
  ScoringSystem,
  Stage,
  Standings,
  Team,
} from '@/types';

const KEYS = {
  championshipList: 'championships', // string[]
  championship: (id: string) => `championship:${id}`,
  teams: (id: string) => `teams:${id}`, // Team[]
  drivers: (id: string) => `drivers:${id}`, // Driver[]
  scoring: (id: string) => `scoring:${id}`, // ScoringSystem[]
  standings: (id: string) => `standings:${id}`, // Standings
  stages: (id: string) => `stages:${id}`, // Stage[]
  organizerTokens: 'organizer-tokens', // OrganizerTokensMap (personal)
} as const;

const SHARED = { shared: true };
const PERSONAL = { shared: false };

export const DataKeys = KEYS;

/* Championships index */
export function listChampionshipIds(): string[] {
  return storage.getJSON<string[]>(KEYS.championshipList, SHARED, []);
}
export function setChampionshipIds(ids: string[]): void {
  storage.setJSON<string[]>(KEYS.championshipList, ids, SHARED);
}

/* Championship */
export function getChampionship(id: string): Championship | null {
  return storage.getJSON<Championship | null>(KEYS.championship(id), SHARED, null);
}
export function setChampionship(c: Championship): void {
  storage.setJSON<Championship>(KEYS.championship(c.id), c, SHARED);
}
export function removeChampionship(id: string): void {
  storage.remove(KEYS.championship(id), SHARED);
  storage.remove(KEYS.teams(id), SHARED);
  storage.remove(KEYS.drivers(id), SHARED);
  storage.remove(KEYS.scoring(id), SHARED);
  storage.remove(KEYS.standings(id), SHARED);
  storage.remove(KEYS.stages(id), SHARED);
  setChampionshipIds(listChampionshipIds().filter((x) => x !== id));
}

/* Teams */
export function getTeams(championshipId: string): Team[] {
  return storage.getJSON<Team[]>(KEYS.teams(championshipId), SHARED, []);
}
export function setTeams(championshipId: string, teams: Team[]): void {
  storage.setJSON<Team[]>(KEYS.teams(championshipId), teams, SHARED);
}

/* Drivers */
export function getDrivers(championshipId: string): Driver[] {
  return storage.getJSON<Driver[]>(KEYS.drivers(championshipId), SHARED, []);
}
export function setDrivers(championshipId: string, drivers: Driver[]): void {
  storage.setJSON<Driver[]>(KEYS.drivers(championshipId), drivers, SHARED);
}

/* Scoring */
export function getScorings(championshipId: string): ScoringSystem[] {
  return storage.getJSON<ScoringSystem[]>(KEYS.scoring(championshipId), SHARED, []);
}
export function setScorings(championshipId: string, list: ScoringSystem[]): void {
  storage.setJSON<ScoringSystem[]>(KEYS.scoring(championshipId), list, SHARED);
}

/* Standings */
export function getStandings(championshipId: string): Standings | null {
  return storage.getJSON<Standings | null>(KEYS.standings(championshipId), SHARED, null);
}
export function setStandings(championshipId: string, s: Standings): void {
  storage.setJSON<Standings>(KEYS.standings(championshipId), s, SHARED);
}
export function removeStandings(championshipId: string): void {
  storage.remove(KEYS.standings(championshipId), SHARED);
}

/* Stages */
export function getStages(championshipId: string): Stage[] {
  return storage.getJSON<Stage[]>(KEYS.stages(championshipId), SHARED, []);
}
export function setStages(championshipId: string, list: Stage[]): void {
  storage.setJSON<Stage[]>(KEYS.stages(championshipId), list, SHARED);
}

/* Personal: organizer tokens */
export function getOrganizerTokens(): OrganizerTokensMap {
  return storage.getJSON<OrganizerTokensMap>(KEYS.organizerTokens, PERSONAL, {});
}
export function setOrganizerTokens(map: OrganizerTokensMap): void {
  storage.setJSON<OrganizerTokensMap>(KEYS.organizerTokens, map, PERSONAL);
}
export function setOrganizerToken(championshipId: string, token: string): void {
  const m = getOrganizerTokens();
  m[championshipId] = token;
  setOrganizerTokens(m);
}
export function getOrganizerToken(championshipId: string): string | undefined {
  return getOrganizerTokens()[championshipId];
}
export function isOrganizer(championshipId: string): boolean {
  return !!getOrganizerToken(championshipId);
}
