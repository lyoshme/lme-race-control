import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Принудительно перезапросить. */
  refresh: () => Promise<void>;
}

interface RealtimeFilter {
  table: string;
  /** Фильтр в формате PostgREST: например 'championship_id=eq.UUID' */
  filter?: string;
}

/**
 * Подписка на одиночный запрос с автоматическим пере-запросом при изменении
 * связанной таблицы через Supabase Realtime.
 *
 * fetcher вызывается при mount и при любом INSERT/UPDATE/DELETE на realtime-канале.
 * Передавай стабильный fetcher (через useCallback) — иначе будет лишний цикл.
 */
export function useSupabaseQuery<T>(
  fetcher: () => Promise<T>,
  realtime?: RealtimeFilter[],
  deps: React.DependencyList = [],
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Стабильная ссылка на fetcher для realtime-листенера
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Realtime
  useEffect(() => {
    if (!realtime || realtime.length === 0) return;
    const channelName = `lmerc:${Math.random().toString(36).slice(2)}`;
    let chan = supabase.channel(channelName);
    for (const rt of realtime) {
      chan = chan.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: rt.table,
          filter: rt.filter,
        },
        () => {
          void refresh();
        },
      );
    }
    chan.subscribe();
    return () => {
      void supabase.removeChannel(chan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh };
}
