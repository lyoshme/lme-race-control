import { useEffect, useState } from 'react';
import { Flag, LogIn, Moon, Sun } from 'lucide-react';
import type { Route } from '@/router';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { AuthModal } from '@/features/auth/AuthModal';
import { UserMenu } from '@/features/auth/UserMenu';

interface Props {
  goHome: () => void;
  current: Route;
}

export function Header({ goHome, current }: Props) {
  const { theme, toggle } = useTheme();
  const { session, initializing } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'sticky top-0 z-30 glass-strong transition-all duration-300',
        scrolled ? 'hero-gradient-border' : '',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <button
          onClick={goHome}
          className="flex items-center gap-2 group"
          aria-label="LMERC — на главную"
        >
          <Flag size={20} className="text-lime-primary transition-transform duration-300 group-hover:rotate-12" />
          <span className="text-xl font-bold tracking-display group-hover:text-lime-primary transition">
            LMERC
          </span>
        </button>
        <div className="flex items-center gap-3">
          {current.view !== 'landing' && (
            <span className="text-xs uppercase tracking-badge text-text-secondary hidden lg:block">
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
          {!initializing && (
            session ? (
              <UserMenu />
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={<LogIn size={14} />}
                onClick={() => setAuthOpen(true)}
              >
                Войти
              </Button>
            )
          )}
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
