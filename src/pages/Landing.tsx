import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { CreateChampionshipModal } from '@/features/championship/CreateChampionshipModal';
import { ChampionshipCard } from '@/features/championship/ChampionshipCard';
import { HeroVideoBackground } from '@/components/layout/HeroVideoBackground';
import { AuthModal } from '@/features/auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';

const heroStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const cardStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function Landing() {
  const { session } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const fetcher = useCallback(() => api.championships.listApproved(), []);
  const { data: items, loading } = useSupabaseQuery(
    fetcher,
    [{ table: 'championships' }],
    [],
  );

  function handleCreateClick() {
    if (!session) {
      setAuthOpen(true);
    } else {
      setCreateOpen(true);
    }
  }

  return (
    <>
      {/* Hero c видео-фоном */}
      <section className="relative border-b border-ink-border overflow-hidden isolate">
        <HeroVideoBackground src="/newvid.mp4" />
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-r from-ink-deep/85 via-ink-deep/50 to-transparent"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-b from-transparent to-ink-deep"
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            className="flex flex-col items-start gap-6 max-w-3xl"
            variants={heroStagger}
            initial="hidden"
            animate="visible"
          >
            <motion.span
              variants={heroItem}
              className="text-xs uppercase tracking-badge text-lime-primary"
            >
              Платформа для автоспорта
            </motion.span>
            <motion.h1
              variants={heroItem}
              className="text-5xl sm:text-7xl font-bold leading-none tracking-display text-gradient-lime"
            >
              LMERC
            </motion.h1>
            <motion.p
              variants={heroItem}
              className="text-base sm:text-lg text-text-secondary max-w-xl"
            >
              Создавайте чемпионаты, управляйте командами и пилотами,
              ведите таблицы и проводите этапы — всё в одном месте.
            </motion.p>
            <motion.div variants={heroItem}>
              <Button
                size="lg"
                icon={<Plus size={18} />}
                onClick={handleCreateClick}
                className="animate-glow-pulse"
              >
                Создать чемпионат
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Список чемпионатов */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-section uppercase">
            Чемпионаты
          </h2>
          {!loading && (items?.length ?? 0) > 0 && (
            <span className="text-xs uppercase tracking-badge text-text-secondary">
              Всего: {items?.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <EmptyState
            icon={<Trophy size={40} />}
            title="Пока нет чемпионатов"
            description="Создайте первый чемпионат — после одобрения админом он появится здесь, и его смогут видеть все."
            action={
              <Button icon={<Plus size={16} />} onClick={handleCreateClick}>
                Создать чемпионат
              </Button>
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={cardStagger}
            initial="hidden"
            animate="visible"
          >
            {items.map((c) => (
              <motion.div key={c.id} variants={cardItem}>
                <ChampionshipCard championship={c} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      <CreateChampionshipModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignedIn={() => setCreateOpen(true)}
      />
    </>
  );
}
