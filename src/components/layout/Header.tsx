import { Flag, Moon, Sun } from 'lucide-react';
import type { Route } from '@/router';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  goHome: () => void;
  current: Route;
}

export function Header({ goHome, current }: Props) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 bg-ink-deep/90 backdrop-blur border-b border-ink-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <button
          onClick={goHome}
          className="flex items-center gap-2 group"
          aria-label="LMERC — на главную"
        >
          <Flag size={20} className="text-lime-primary" />
          <span className="text-xl font-bold tracking-display group-hover:text-lime-primary transition">
            LMERC
          </span>
        </button>
        <div className="flex items-center gap-3">
          {current.view !== 'landing' && (
            <span className="text-xs uppercase tracking-badge text-text-secondary hidden sm:block">
              Платформа автоспортивных чемпионатов
            </span>
          )}
          <button
            onClick={toggle}
            className="p-2 rounded text-text-secondary hover:text-lime-primary hover:bg-ink-elevated transition"
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
