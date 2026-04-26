/**
 * Абстракция хранилища.
 * Использует window.storage (если доступен в среде исполнения)
 * с поддержкой shared/personal через флаг shared: boolean.
 * Иначе — fallback на localStorage с префиксами.
 *
 * API синхронное со стороны вызова: getJSON/setJSON оборачивают
 * сериализацию JSON. Подписка через подписчиков на ключ.
 */

type Listener = () => void;

interface WindowStorageAPI {
  get?: (key: string, opts?: { shared?: boolean }) => string | null | Promise<string | null>;
  set?: (key: string, value: string, opts?: { shared?: boolean }) => void | Promise<void>;
  remove?: (key: string, opts?: { shared?: boolean }) => void | Promise<void>;
}

declare global {
  interface Window {
    storage?: WindowStorageAPI;
  }
}

const SHARED_PREFIX = 'lmerc:shared:';
const PERSONAL_PREFIX = 'lmerc:personal:';

function buildKey(key: string, shared: boolean): string {
  return (shared ? SHARED_PREFIX : PERSONAL_PREFIX) + key;
}

function hasWindowStorage(): boolean {
  return typeof window !== 'undefined' && !!window.storage && typeof window.storage.get === 'function';
}

/* ----- Низкоуровневый sync-доступ ----- */

function rawGet(key: string, shared: boolean): string | null {
  const fullKey = buildKey(key, shared);
  if (hasWindowStorage()) {
    try {
      const v = window.storage!.get!(fullKey, { shared });
      // window.storage может быть синхронным или асинхронным —
      // мы поддерживаем только синхронный путь; асинхронный fallback
      // на localStorage.
      if (typeof v === 'string' || v === null) return v;
    } catch {
      /* fallthrough */
    }
  }
  try {
    return localStorage.getItem(fullKey);
  } catch {
    return null;
  }
}

function rawSet(key: string, value: string, shared: boolean): void {
  const fullKey = buildKey(key, shared);
  if (hasWindowStorage() && typeof window.storage!.set === 'function') {
    try {
      void window.storage!.set!(fullKey, value, { shared });
    } catch {
      /* fallthrough */
    }
  }
  try {
    localStorage.setItem(fullKey, value);
  } catch (e) {
    console.error('[storage] localStorage.setItem failed', e);
    throw e;
  }
}

function rawRemove(key: string, shared: boolean): void {
  const fullKey = buildKey(key, shared);
  if (hasWindowStorage() && typeof window.storage!.remove === 'function') {
    try {
      void window.storage!.remove!(fullKey, { shared });
    } catch {
      /* fallthrough */
    }
  }
  try {
    localStorage.removeItem(fullKey);
  } catch {
    /* ignore */
  }
}

/* ----- JSON-обёртка + подписки ----- */

const listeners = new Map<string, Set<Listener>>();

function subscriptionKey(key: string, shared: boolean): string {
  return buildKey(key, shared);
}

function notify(key: string, shared: boolean): void {
  const set = listeners.get(subscriptionKey(key, shared));
  if (set) for (const l of Array.from(set)) l();
}

export const storage = {
  getJSON<T>(key: string, opts: { shared: boolean }, fallback: T): T {
    const raw = rawGet(key, opts.shared);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  setJSON<T>(key: string, value: T, opts: { shared: boolean }): void {
    rawSet(key, JSON.stringify(value), opts.shared);
    notify(key, opts.shared);
  },
  remove(key: string, opts: { shared: boolean }): void {
    rawRemove(key, opts.shared);
    notify(key, opts.shared);
  },
  subscribe(key: string, opts: { shared: boolean }, listener: Listener): () => void {
    const k = subscriptionKey(key, opts.shared);
    let set = listeners.get(k);
    if (!set) {
      set = new Set();
      listeners.set(k, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) listeners.delete(k);
    };
  },
};

/* Синхронизация между вкладками через storage event */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key.startsWith(SHARED_PREFIX)) {
      const k = e.key.slice(SHARED_PREFIX.length);
      notify(k, true);
    } else if (e.key.startsWith(PERSONAL_PREFIX)) {
      const k = e.key.slice(PERSONAL_PREFIX.length);
      notify(k, false);
    }
  });
}
