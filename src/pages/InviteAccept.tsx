import { useEffect, useState } from 'react';
import { Shield, Check, X, AlertTriangle, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AuthModal } from '@/features/auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/router';
import { useToast } from '@/components/toast/ToastContext';
import * as api from '@/lib/api';
import type { ChampionshipInvite } from '@/types';

interface Props {
  inviteId: string;
}

export function InviteAccept({ inviteId }: Props) {
  const { session } = useAuth();
  const { goManage, goHome } = useRouter();
  const toast = useToast();

  const [invite, setInvite] = useState<(ChampionshipInvite & { championshipTitle: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Загрузка деталей инвайта
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.editors.getInvite(inviteId);
        if (!alive) return;
        if (!data) {
          setError('Приглашение не найдено, недействительно или уже было активировано.');
        } else {
          setInvite(data);
        }
      } catch (e) {
        console.error(e);
        if (alive) setError('Не удалось загрузить данные приглашения.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [inviteId]);

  async function handleAccept() {
    if (!session) return;
    setBusy(true);
    try {
      const champId = await api.editors.acceptInvite(inviteId);
      toast.success('Вы успешно стали со-редактором чемпионата!');
      goManage(champId);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Не удалось принять приглашение.';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-bold uppercase tracking-section mb-2">Ошибка приглашения</h1>
        <p className="text-sm text-text-secondary mb-6">{error || 'Приглашение не существует.'}</p>
        <Button variant="secondary" onClick={goHome}>
          На главную
        </Button>
      </div>
    );
  }

  const permissionsList = [
    { label: 'Изменение настроек чемпионата', value: invite.canManageSettings },
    { label: 'Управление командами и пилотами', value: invite.canManageTeams },
    { label: 'Настройка систем начисления очков', value: invite.canManageScoring },
    { label: 'Проведение и откат этапов', value: invite.canManageStages },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-ink-card border border-ink-border rounded-lg p-6 sm:p-8 relative overflow-hidden animate-slide-up shadow-xl">
        {/* Декоративное свечение */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-lime-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-12 h-12 rounded bg-lime-primary/10 text-lime-primary flex items-center justify-center mb-6">
          <Shield size={24} />
        </div>

        <span className="text-xs uppercase tracking-badge text-lime-primary font-bold">Приглашение к управлению</span>
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-display mt-1 mb-4">
          {invite.championshipTitle}
        </h1>

        <p className="text-sm text-text-secondary mb-6">
          Вас пригласили стать со-редактором этого чемпионата. Вам будут предоставлены следующие права доступа:
        </p>

        {/* Список прав */}
        <div className="space-y-3 mb-8 bg-ink-deep border border-ink-border rounded p-4">
          {permissionsList.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-text-secondary">{p.label}</span>
              <div className="flex items-center gap-1.5 font-bold shrink-0 uppercase tracking-badge">
                {p.value ? (
                  <span className="text-lime-primary flex items-center gap-1">
                    <Check size={14} /> Разрешено
                  </span>
                ) : (
                  <span className="text-text-muted flex items-center gap-1">
                    <X size={14} /> Запрещено
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Экшен кнопки */}
        {session ? (
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              onClick={() => void handleAccept()}
              loading={busy}
              icon={<UserPlus size={18} />}
              className="w-full justify-center"
            >
              Принять приглашение
            </Button>
            <Button variant="ghost" onClick={goHome} disabled={busy} className="w-full justify-center text-xs">
              Отказаться
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-ink-elevated border border-ink-border rounded p-3 text-xs text-text-secondary mb-4">
              Чтобы принять приглашение, вам нужно войти в свой аккаунт LMERC.
            </div>
            <Button
              size="lg"
              icon={<LogIn size={18} />}
              onClick={() => setAuthOpen(true)}
              className="w-full justify-center"
            >
              Войти и принять
            </Button>
          </div>
        )}
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignedIn={() => {
          setAuthOpen(false);
          toast.success('Вы успешно вошли! Теперь вы можете принять приглашение.');
        }}
      />
    </div>
  );
}
