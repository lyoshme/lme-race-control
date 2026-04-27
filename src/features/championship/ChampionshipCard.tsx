import { Flag, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from '@/router';
import { useAuth } from '@/hooks/useAuth';
import type { Championship } from '@/types';
import { DISCIPLINE_LABELS } from '@/types';

interface Props {
  championship: Championship;
}

export function ChampionshipCard({ championship }: Props) {
  const { goPublic, goManage } = useRouter();
  const { session, profile } = useAuth();

  const isOrganizer =
    !!(session && championship.ownerId === session.user.id) ||
    !!profile?.is_admin;

  const discipline =
    championship.discipline === 'custom' && championship.disciplineCustom
      ? championship.disciplineCustom
      : DISCIPLINE_LABELS[championship.discipline];

  return (
    <div className="group bg-ink-card border border-ink-border rounded overflow-hidden hover:border-lime-primary transition flex flex-col">
      <button
        onClick={() => goPublic(championship.id)}
        className="text-left flex-1 flex flex-col"
      >
        <div className="aspect-video bg-ink-elevated overflow-hidden relative">
          {championship.banner ? (
            <img
              src={championship.banner}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <Flag size={36} />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge variant={championship.status === 'active' ? 'lime' : 'muted'}>
              {championship.status === 'active' ? 'Активен' : 'Завершён'}
            </Badge>
          </div>
          {championship.season && (
            <div className="absolute top-3 right-3">
              <Badge variant="muted">{championship.season}</Badge>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="text-lg font-bold tracking-section uppercase line-clamp-1">
            {championship.title}
          </h3>
          {championship.slogan && (
            <p className="text-xs text-lime-primary uppercase tracking-badge line-clamp-1">
              {championship.slogan}
            </p>
          )}
          <p className="text-sm text-text-secondary line-clamp-2 min-h-[40px]">
            {championship.description || '—'}
          </p>
          <div className="flex items-center gap-3 text-xs text-text-secondary mt-auto pt-2 tabular">
            <span className="text-text-muted uppercase tracking-badge text-[10px]">
              {discipline}
            </span>
          </div>
        </div>
      </button>
      {isOrganizer && (
        <div className="border-t border-ink-border">
          <button
            onClick={() => goManage(championship.id)}
            className="w-full px-4 py-2.5 text-xs uppercase tracking-badge text-text-secondary hover:text-lime-primary hover:bg-ink-elevated transition flex items-center justify-center gap-2"
          >
            <Settings size={14} />
            Управление
          </button>
        </div>
      )}
    </div>
  );
}
