import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Shield,
  Check,
  X,
  User,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/router';
import { useToast } from '@/components/toast/ToastContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import type { Championship } from '@/types';
import { DISCIPLINE_LABELS } from '@/types';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function AdminPanel() {
  const { session, profile, initializing } = useAuth();
  const { goHome, goManage } = useRouter();
  const toast = useToast();

  const [rejectModal, setRejectModal] = useState<Championship | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingFetcher = useCallback(() => api.championships.listByStatus('pending'), []);
  const { data: pendingList, loading, refresh } = useSupabaseQuery<Championship[]>(
    pendingFetcher,
    [{ table: 'championships' }],
    [],
  );

  async function handleApprove(champ: Championship) {
    setBusyId(champ.id);
    try {
      await api.championships.approve(champ.id);
      toast.success(`«${champ.title}» одобрен`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось одобрить');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(champ: Championship, reason: string) {
    setBusyId(champ.id);
    try {
      await api.championships.reject(champ.id, reason.trim());
      toast.success(`«${champ.title}» отклонён`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось отклонить');
    } finally {
      setBusyId(null);
    }
  }

  if (initializing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <Skeleton className="h-12 mb-6" />
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
          action={<Button variant="secondary" onClick={goHome}>На главную</Button>}
        />
      </div>
    );
  }

  if (!profile?.is_admin) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <EmptyState
          icon={<Lock size={36} />}
          title="Нет прав администратора"
          description="Эта страница доступна только пользователям с флагом is_admin."
          action={<Button variant="secondary" onClick={goHome}>На главную</Button>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.h1
        className="text-2xl sm:text-3xl font-bold tracking-display uppercase mb-2 flex items-center gap-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Shield className="text-lime-primary" /> Админ-панель
      </motion.h1>
      <motion.p
        className="text-sm text-text-secondary mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Очередь модерации чемпионатов. Одобренные появятся на главной странице.
      </motion.p>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : !pendingList || pendingList.length === 0 ? (
        <EmptyState
          icon={<Clock size={36} />}
          title="Очередь пуста"
          description="Нет чемпионатов, ожидающих модерации."
        />
      ) : (
        <motion.div
          className="flex flex-col gap-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {pendingList.map((c) => (
            <motion.div
              key={c.id}
              variants={item}
              className="bg-ink-card border border-ink-border rounded p-4 flex flex-col sm:flex-row gap-4 sm:items-start"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold tracking-section uppercase truncate">{c.title}</h3>
                  <Badge variant="muted">На модерации</Badge>
                </div>
                <p className="text-xs text-text-secondary mb-2">
                  {c.discipline === 'custom' && c.disciplineCustom
                    ? c.disciplineCustom
                    : DISCIPLINE_LABELS[c.discipline]}
                  {c.season ? ` · ${c.season}` : ''}
                </p>
                <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                  {c.description || '—'}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <User size={12} />
                  <span>Владелец: {c.ownerId?.slice(0, 8) ?? '—'}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 sm:pt-1">
                <Button
                  size="sm"
                  icon={<Check size={14} />}
                  onClick={() => void handleApprove(c)}
                  disabled={busyId === c.id}
                  loading={busyId === c.id}
                >
                  Одобрить
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<X size={14} />}
                  onClick={() => {
                    setRejectReason('');
                    setRejectModal(c);
                  }}
                  disabled={busyId === c.id}
                >
                  Отклонить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<ChevronRight size={14} />}
                  onClick={() => goManage(c.id)}
                  title="Управление"
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <RejectModal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        onConfirm={(reason) => {
          if (rejectModal) {
            void handleReject(rejectModal, reason);
          }
          setRejectModal(null);
        }}
      />
    </div>
  );
}

function RejectModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Отклонить чемпионат"
      size="sm"
      footer={
        <>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!reason.trim()) {
                setError('Укажите причину отклонения');
                return;
              }
              onConfirm(reason);
              setReason('');
              setError('');
            }}
          >
            Отклонить
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          Укажите причину — она будет видна владельцу чемпионата в личном кабинете.
        </p>
        <Textarea
          label="Причина отклонения"
          required
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          rows={3}
          error={error || undefined}
        />
      </div>
    </Modal>
  );
}
