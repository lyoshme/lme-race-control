import { useEffect, useRef, useState } from 'react';
import { LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/router';

export function UserMenu() {
  const { profile, session, signOut } = useAuth();
  const { goAccount, goAdmin, goHome } = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!session) return null;
  const initial = (profile?.email ?? session.user.email ?? '?').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 p-1 pl-1 pr-2 rounded border border-ink-border hover:border-lime-primary transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="w-7 h-7 rounded-full bg-lime-primary text-ink-deep flex items-center justify-center text-sm font-bold">
          {initial}
        </span>
        <span className="text-xs uppercase tracking-badge hidden md:inline max-w-[140px] truncate">
          {profile?.display_name || profile?.email || session.user.email}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-ink-elevated border border-ink-border rounded shadow-2xl overflow-hidden z-40"
        >
          <div className="px-3 py-2 border-b border-ink-border">
            <div className="text-[11px] uppercase tracking-badge text-text-muted">
              Вошли как
            </div>
            <div className="text-sm font-bold truncate">
              {profile?.email || session.user.email}
            </div>
            {profile?.is_admin && (
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-badge text-lime-primary">
                <Shield size={10} /> Администратор
              </div>
            )}
          </div>

          <MenuItem
            icon={<UserIcon size={14} />}
            onClick={() => {
              setOpen(false);
              goAccount();
            }}
          >
            Личный кабинет
          </MenuItem>

          {profile?.is_admin && (
            <MenuItem
              icon={<Shield size={14} />}
              onClick={() => {
                setOpen(false);
                goAdmin();
              }}
            >
              Админ-панель
            </MenuItem>
          )}

          <div className="border-t border-ink-border" />

          <MenuItem
            icon={<LogOut size={14} />}
            danger
            onClick={async () => {
              setOpen(false);
              await signOut();
              goHome();
            }}
          >
            Выйти
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition',
        danger
          ? 'text-danger hover:bg-danger/10'
          : 'hover:bg-ink-card hover:text-lime-primary',
      ].join(' ')}
    >
      {icon}
      {children}
    </button>
  );
}
