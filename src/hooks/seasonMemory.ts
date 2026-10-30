import { useCallback, useEffect, useState } from 'react';
import type { Season } from '@/types';

/**
 * Память выбора сезона и последней публичной вкладки.
 *
 * Выбор сезона сознательно живёт в React state страниц (не в URL), поэтому
 * при переходах «публичная страница → профиль пилота → назад» страница
 * пересоздавалась и возвращалась на активный (последний) сезон. Здесь
 * последний ВЫБРАННЫЙ пользователем сезон сохраняется в localStorage
 * (отдельная ключ пара на чемпионат): переживает навигацию и перезагрузку.
 * Неявный выбор пользователя не запоминается: первое открытие ссылки
 * и/или просроченный (удалённый) id дисциплинируются к активному сезону.
 */
const SEASON_PREFIX = 'lmerc.season.';
const TAB_PREFIX = 'lmerc.publicTab.';

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    // Приватный режим / заблокированный localStorage — живём без памяти
    return '';
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* см. read */
  }
}

/* -------------------- Сезон -------------------- */

/** Запомнить сезон чемпионата (явный выбор или сезон просмотренного профиля). */
export function rememberSeason(championshipId: string, seasonId: string): void {
  write(SEASON_PREFIX + championshipId, seasonId);
}

/** Хук: [seasonId, setSeasonId] с сохранением явного выбора между визитами. */
export function usePersistedSeason(
  championshipId: string,
  seasons: Season[] | null | undefined,
): [string, (seasonId: string) => void] {
  const [seasonId, setSeasonIdState] = useState<string>(() =>
    read(SEASON_PREFIX + championshipId),
  );

  // Сохранённый id может устареть (сезон удалён другим организатором)
  // или отсутствовать (первый визит) → фолбэк на активный сезон.
  useEffect(() => {
    if (!seasons || seasons.length === 0) return;
    if (seasonId && seasons.some((s) => s.id === seasonId)) return;
    const active = seasons.find((s) => s.isActive) ?? seasons[0];
    if (!active) return;
    setSeasonIdState(active.id);
  }, [seasons, seasonId]);

  const setSeasonId = useCallback(
    (id: string) => {
      setSeasonIdState(id);
      rememberSeason(championshipId, id);
    },
    [championshipId],
  );

  return [seasonId, setSeasonId];
}

/* -------------------- Публичная вкладка -------------------- */

/** Запомнить вкладку публичной страницы (для «Назад к чемпионату»). */
export function rememberPublicTab(championshipId: string, tab: string): void {
  write(TAB_PREFIX + championshipId, tab);
}

/** Последняя просмотренная вкладка публичной страницы ('' — нет памяти). */
export function readRememberedPublicTab(championshipId: string): string {
  return read(TAB_PREFIX + championshipId);
}
