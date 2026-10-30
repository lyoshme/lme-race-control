import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, BellRing, CheckCheck, ShieldCheck, Smartphone, Trophy, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { usePush } from '@/hooks/usePush';
import { useRouter } from '@/router';
import type { ManageTab } from '@/router';
import * as api from '@/lib/api';
import { NOTIFICATION_KIND_LABELS, STAGE_TYPE_LABELS } from '@/types';
import type { Notification, NotificationKind, StageType } from '@/types';

/** Иконка по типу события. */
const KIND_ICONS: Record<NotificationKind, typeof Bell> = {
  stage_confirmed: Trophy,
  championship_moderated: ShieldCheck,
  editor_joined: UserPlus,
};

/** Куда ведёт клик по уведомлению (вкладка manage своего чемпионата). */
const KIND_MANAGE_TAB: Record<NotificationKind, ManageTab> = {
  stage_confirmed: 'stages',
  championship_moderated: 'settings',
  editor_joined: 'editors',
};

/** Текст карточки по kind: payload пришёл из триггеров миграции 0080. */
function notificationText(n: Notification): { title: string; detail?: string } {
  switch (n.kind) {
    case 'stage_confirmed': {
      const p = n.payload as {
        stageName?: string;
        track?: string;
        stageDate?: string;
        type?: StageType;
      };
      const name = p.stageName ?? NOTIFICATION_KIND_LABELS.stage_confirmed;
      const title = p.track ? `${name} — ${p.track}` : name;
      const typeLabel = p.type ? STAGE_TYPE_LABELS[p.type] ?? null : null;
      const dateLabel = p.stageDate
        ? new Date(p.stageDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        : null;
      const detail = [typeLabel, dateLabel].filter(Boolean).join(' · ');
      return { title, detail: detail || undefined };
    }
    case 'championship_moderated': {
      const p = n.payload as {
        status?: 'approved' | 'rejected';
        rejectionReason?: string | null;
        title?: string;
      };
      if (p.status === 'rejected') {
        return {
          title: `Чемпионат «${p.title ?? ''}» отклонён`,
          detail: p.rejectionReason?.trim() || NOTIFICATION_KIND_LABELS.championship_moderated,
        };
      }
      return { title: `Чемпионат «${p.title ?? ''}» одобрен` };
    }
    case 'editor_joined': {
      const p = n.payload as { editorName?: string };
      return { title: `${p.editorName ?? 'Новый участник'} — со-редактор чемпионата` };
    }
    default:
      return { title: NOTIFICATION_KIND_LABELS[n.kind] };
  }
}

/** «5 мин назад», «2 ч назад», «3 д назад», после — дата. */
function formatRelativeTime(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} д назад`;
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const { notifications, unreadCount, refresh } = useNotifications();
  const { session } = useAuth();
  const { status: pushStatus, busy: pushBusy, enable, disable } = usePush();
  const { goManage, goHome } = useRouter();
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  function handleEnablePush() {
    void enable().catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[push] подписка не удалась', e);
    });
  }

  function handleDisablePush() {
    void disable().catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[push] отписка не удалась', e);
    });
  }

  const handleOpen = useCallback(() => {
    setOpen((prev) => {
      // Открываем панель — свежий запрос; Realtime иногда запаздывает.
      if (!prev) void refresh();
      return !prev;
    });
  }, [refresh]);

  async function handleClick(n: Notification) {
    setOpen(false);
    // Отметку «прочитано» отправляем фоном, не блокируя переход.
    if (!n.isRead) void api.notifications.markRead(n.id).catch(() => undefined);
    if (n.championshipId) {
      goManage(n.championshipId, KIND_MANAGE_TAB[n.kind]);
    } else {
      goHome();
    }
  }

  async function handleMarkAll() {
    if (markingAll || !session) return;
    setMarkingAll(true);
    try {
      await api.notifications.markAllRead(session.user.id);
      await refresh();
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded text-text-secondary hover:text-lime-primary hover:bg-ink-elevated transition"
        aria-label={`Уведомления${unreadCount > 0 ? `, непрочитанных: ${unreadCount}` : ''}`}
        title="Уведомления"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-lime-primary text-ink-deep text-3xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 45 }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full mt-1 z-50 w-[340px] max-w-[calc(100vw-1rem)] max-h-[70dvh] overflow-y-auto glass rounded border border-ink-border shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-ink-border px-3 py-2">
              <span className="text-xs uppercase tracking-badge text-text-secondary">
                Уведомления
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={markingAll}
                  className="text-2xs text-lime-primary hover:text-lime-dark transition flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCheck size={12} />
                  {markingAll ? 'Отмечаем…' : 'Прочитать все'}
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={20} className="mx-auto text-text-muted mb-2" />
                <p className="text-2xs text-text-muted">Уведомлений пока нет</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = KIND_ICONS[n.kind];
                const { title, detail } = notificationText(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    title={new Date(n.createdAt).toLocaleString('ru-RU')}
                    className={[
                      'w-full text-left px-3 py-2.5 flex gap-2.5 transition border-b border-ink-border last:border-b-0 hover:bg-ink-elevated',
                      n.isRead ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'w-7 h-7 rounded bg-ink-elevated flex items-center justify-center shrink-0',
                        n.isRead ? 'text-text-muted' : 'text-lime-primary',
                      ].join(' ')}
                    >
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-text-primary truncate">
                        {title}
                      </span>
                      {detail && (
                        <span className="block text-2xs text-text-secondary truncate">{detail}</span>
                      )}
                      <span className="block text-3xs text-text-muted mt-0.5">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </span>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-primary self-center shrink-0" />
                    )}
                  </button>
                );
              })
            )}

            {session && pushStatus !== 'unsupported' && (
              <div className="border-t border-ink-border px-3 py-2">
                {pushStatus === 'on' && (
                  <button
                    onClick={handleDisablePush}
                    disabled={pushBusy}
                    className="w-full flex items-center gap-2 text-2xs text-text-secondary hover:text-text-primary transition disabled:opacity-50"
                  >
                    <BellOff size={12} />
                    {pushBusy ? 'Выключаем…' : 'Выключить push-уведомления'}
                  </button>
                )}
                {pushStatus === 'off' && (
                  <button
                    onClick={handleEnablePush}
                    disabled={pushBusy}
                    className="w-full flex items-center gap-2 text-2xs text-lime-primary hover:text-lime-dark transition disabled:opacity-50"
                  >
                    <BellRing size={12} />
                    {pushBusy ? 'Включаем…' : 'Включить push-уведомления'}
                  </button>
                )}
                {pushStatus === 'needs-install' && (
                  <p className="text-2xs text-text-muted flex gap-2">
                    <Smartphone size={12} className="shrink-0 mt-0.5" />
                    <span>
                      Push на iPhone работает только в установленном приложении:
                      «Поделиться» → «На экран “Домой”».
                    </span>
                  </p>
                )}
                {pushStatus === 'denied' && (
                  <p className="text-2xs text-text-muted flex gap-2">
                    <BellOff size={12} className="shrink-0 mt-0.5" />
                    <span>Уведомления запрещены в настройках сайта — включите их в браузере.</span>
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
