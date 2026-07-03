import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  User,
  Edit3,
  Check,
  X,
  Plus,
  Flag,
  Clock,
  AlertCircle,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/router';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import type { Championship } from '@/types';
import { DISCIPLINE_LABELS } from '@/types';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function Account() {
  const { session, profile, initializing, updateProfile } = useAuth();
  const { goHome, goManage, goPublic } = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);

  const mineFetcher = useCallback(
    () =>
      session?.user.id
        ? api.championships.listMine(session.user.id)
        : Promise.resolve<Championship[]>([]),
    [session?.user.id],
  );
  const { data: myChampionships, loading: listLoading } = useSupabaseQuery<Championship[]>(
    mineFetcher,
    [{ table: 'championships' }],
    [session?.user.id],
  );

  const editedFetcher = useCallback(
    () =>
      session?.user.id
        ? api.championships.listEdited(session.user.id)
        : Promise.resolve<Championship[]>([]),
    [session?.user.id],
  );
  const { data: editedChampionships, loading: editedLoading } = useSupabaseQuery<Championship[]>(
    editedFetcher,
    [{ table: 'championship_editors' }],
    [session?.user.id],
  );

  if (initializing) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <Skeleton className="h-20 mb-8" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <EmptyState
          icon={<Lock size={36} />}
          title="Требуется вход"
          description="Войдите по email, чтобы открыть личный кабинет."
          action={
            <Button variant="secondary" onClick={goHome}>
              На главную
            </Button>
          }
        />
      </div>
    );
  }

  async function saveDisplayName() {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await updateProfile({ display_name: trimmed });
      setEditingName(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <motion.div
        className="flex items-start gap-4 mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="w-14 h-14 rounded-full bg-lime-primary text-ink-deep flex items-center justify-center text-2xl font-bold shrink-0">
          {(profile?.email ?? session.user.email ?? '?').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                className="max-w-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveDisplayName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
              />
              <Button size="sm" icon={<Check size={14} />} onClick={() => void saveDisplayName()} loading={savingName} />
              <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setEditingName(false)} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-display uppercase">
                {profile?.display_name || 'Личный кабинет'}
              </h1>
              <button
                onClick={() => {
                  setDisplayName(profile?.display_name ?? '');
                  setEditingName(true);
                }}
                className="p-1.5 rounded text-text-muted hover:text-lime-primary hover:bg-ink-elevated transition"
                title="Изменить имя"
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
          <p className="text-sm text-text-secondary mt-1 truncate flex items-center gap-2">
            <User size={14} />
            {profile?.email || session.user.email}
          </p>
        </div>
      </motion.div>

      {/* My Championships */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-section uppercase">Мои чемпионаты</h2>
        <Button size="sm" icon={<Plus size={14} />} onClick={goHome}>
          Создать
        </Button>
      </div>

      {listLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : !myChampionships || myChampionships.length === 0 ? (
        <EmptyState
          icon={<Flag size={36} />}
          title="Нет чемпионатов"
          description="Создайте первый чемпионат — он появится здесь после отправки на модерацию."
          action={
            <Button variant="secondary" onClick={goHome}>
              На главную
            </Button>
          }
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {myChampionships.map((c) => (
            <motion.div key={c.id} variants={item}>
              <ChampCard championship={c} onManage={() => goManage(c.id)} onPublic={() => goPublic(c.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Edited Championships */}
      {editedChampionships && editedChampionships.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-section uppercase">Управление (как редактор)</h2>
          </div>
          {editedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-32" />
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {editedChampionships.map((c) => (
                <motion.div key={c.id} variants={item}>
                  <ChampCard
                    championship={c}
                    onManage={() => goManage(c.id)}
                    onPublic={() => goPublic(c.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

function ChampCard({
  championship,
  onManage,
  onPublic,
}: {
  championship: Championship;
  onManage: () => void;
  onPublic: () => void;
}) {
  const moderation = championship.moderationStatus;
  const statusColor =
    moderation === 'approved'
      ? 'lime'
      : moderation === 'rejected'
        ? 'muted'
        : 'muted';
  const statusLabel =
    moderation === 'approved'
      ? 'Опубликован'
      : moderation === 'rejected'
        ? 'Отклонён'
        : 'На модерации';

  return (
    <div className="card-hover bg-ink-card border border-ink-border rounded p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold tracking-section uppercase truncate">{championship.title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {championship.discipline === 'custom' && championship.disciplineCustom
              ? championship.disciplineCustom
              : DISCIPLINE_LABELS[championship.discipline]}
            {championship.season ? ` · ${championship.season}` : ''}
          </p>
        </div>
        <Badge variant={statusColor as 'lime' | 'muted'}>{statusLabel}</Badge>
      </div>

      {moderation === 'rejected' && championship.rejectionReason && (
        <div className="text-xs bg-danger/10 border border-danger/30 rounded p-2 text-danger">
          <AlertCircle size={12} className="inline mr-1" />
          {championship.rejectionReason}
        </div>
      )}

      {moderation === 'pending' && (
        <div className="text-xs bg-ink-elevated border border-ink-border rounded p-2 text-text-secondary flex items-center gap-1.5">
          <Clock size={12} />
          Ожидает одобрения администратора
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-1">
        <Button size="sm" variant="secondary" icon={<Settings size={14} />} onClick={onManage}>
          Управление
        </Button>
        {moderation === 'approved' && (
          <Button size="sm" variant="ghost" icon={<ChevronRight size={14} />} onClick={onPublic}>
            Публичный вид
          </Button>
        )}
      </div>
    </div>
  );
}
