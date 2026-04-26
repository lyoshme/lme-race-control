import { useCallback, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';

export function useStorage<T>(
  key: string,
  shared: boolean,
  fallback: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => storage.getJSON<T>(key, { shared }, fallback));

  useEffect(() => {
    const unsub = storage.subscribe(key, { shared }, () => {
      setValue(storage.getJSON<T>(key, { shared }, fallback));
    });
    // Re-read on mount in case key/shared changed
    setValue(storage.getJSON<T>(key, { shared }, fallback));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, shared]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = storage.getJSON<T>(key, { shared }, fallback);
      const computed =
        typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      storage.setJSON<T>(key, computed, { shared });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, shared],
  );

  return [value, update];
}
