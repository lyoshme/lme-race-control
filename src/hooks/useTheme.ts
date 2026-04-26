import { useCallback, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';

export type Theme = 'dark' | 'light';

const KEY = 'theme';

function readStored(): Theme {
  return storage.getJSON<Theme>(KEY, { shared: false }, 'dark');
}

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', t);
}

export function useTheme(): {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
} {
  const [theme, setThemeState] = useState<Theme>(() => readStored());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    return storage.subscribe(KEY, { shared: false }, () => {
      setThemeState(readStored());
    });
  }, []);

  const setTheme = useCallback((t: Theme) => {
    storage.setJSON<Theme>(KEY, t, { shared: false });
  }, []);

  const toggle = useCallback(() => {
    setTheme(readStored() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, setTheme, toggle };
}

/* Применяем тему как можно раньше — до первого рендера React,
   чтобы не было "вспышки" неправильной темы. */
export function applyInitialTheme() {
  if (typeof document === 'undefined') return;
  applyTheme(readStored());
}
