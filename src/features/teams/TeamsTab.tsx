import { useCallback, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, UserPlus, Flag, GripVertical } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/toast/ToastContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import { CountryFlag } from '@/components/ui/CountryFlag';
import type { Driver, Team } from '@/types';
import { TeamModal } from './TeamModal';
import { DriverModal } from '@/features/drivers/DriverModal';

// Идентификатор «контейнера без команды» для drop-зоны
const ORPHANS_ID = '__orphans__';

interface Props {
  championshipId: string;
  seasonId: string;
  permissions: {
    canManageTeams: boolean;
    isOwner: boolean;
  };
}

export function TeamsTab({ championshipId, seasonId, permissions }: Props) {
  const toast = useToast();

  const teamsFetcher = useCallback(
    () => api.teams.list(championshipId, seasonId),
    [championshipId, seasonId],
  );
  const driversFetcher = useCallback(
    () => api.drivers.list(championshipId, seasonId),
    [championshipId, seasonId],
  );
  const teamsQ = useSupabaseQuery<Team[]>(
    teamsFetcher,
    [{ table: 'teams', filter: `championship_id=eq.${championshipId}` }],
    [championshipId],
  );
  const driversQ = useSupabaseQuery<Driver[]>(
    driversFetcher,
    [{ table: 'drivers', filter: `championship_id=eq.${championshipId}` }],
    [championshipId],
  );
  const teams = teamsQ.data ?? [];
  const drivers = driversQ.data ?? [];
  const dataLoading = teamsQ.loading || driversQ.loading;

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<Team | null>(null);

  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [defaultTeamId, setDefaultTeamId] = useState<string | null>(null);
  const [confirmDeleteDriver, setConfirmDeleteDriver] = useState<Driver | null>(null);

  /* ---------------- Drag-and-drop ---------------- */
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const sensors = useSensors(
    // distance:5 чтобы не блокировать клики по Edit/Delete
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const driverIndex = useMemo(
    () => new Map(drivers.map((d) => [d.id, d])),
    [drivers],
  );

  async function moveDriverToTeam(driverId: string, targetTeamId: string | null) {
    const driver = driverIndex.get(driverId);
    if (!driver) return;
    if (driver.teamId === targetTeamId) return;

    try {
      await api.drivers.setTeam(driverId, targetTeamId);
      const targetName = targetTeamId
        ? teams.find((t) => t.id === targetTeamId)?.name ?? '—'
        : 'без команды';
      toast.success(`${driver.firstName} ${driver.lastName} → ${targetName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось переместить';
      toast.error(msg);
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveDriverId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveDriverId(null);
    if (!permissions.canManageTeams) return;
    if (!e.over) return;
    const overId = String(e.over.id);
    const targetTeamId = overId === ORPHANS_ID ? null : overId;
    moveDriverToTeam(String(e.active.id), targetTeamId);
  }
  function onDragCancel() {
    setActiveDriverId(null);
  }

  const activeDriver = activeDriverId ? driverIndex.get(activeDriverId) ?? null : null;

  function openTeamModal(t?: Team | null) {
    setEditingTeam(t ?? null);
    setTeamModalOpen(true);
  }
  function openDriverModal(d?: Driver | null, teamId?: string | null) {
    setEditingDriver(d ?? null);
    setDefaultTeamId(teamId ?? null);
    setDriverModalOpen(true);
  }

  async function deleteTeam(team: Team) {
    try {
      // ON DELETE SET NULL на drivers.team_id — пилоты автоматом «без команды»
      await api.teams.remove(team.id);
      toast.success(`Команда «${team.name}» удалена`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось удалить команду';
      toast.error(msg);
    }
  }

  async function deleteDriver(driver: Driver) {
    try {
      await api.drivers.remove(driver.id);
      toast.success(`Пилот ${driver.lastName} удалён`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось удалить пилота';
      toast.error(msg);
    }
  }

  const driversByTeam = new Map<string | null, Driver[]>();
  for (const d of drivers) {
    const k = d.teamId;
    const arr = driversByTeam.get(k) ?? [];
    arr.push(d);
    driversByTeam.set(k, arr);
  }
  const orphans = driversByTeam.get(null) ?? [];

  if (dataLoading && teams.length === 0 && drivers.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-section uppercase">Команды и пилоты</h2>
          <p className="text-sm text-text-secondary mt-1">
            Команды:{' '}
            <span className="tabular text-text-primary">{teams.length}</span> · Пилотов:{' '}
            <span className="tabular text-text-primary">{drivers.length}</span>
          </p>
        </div>
        {permissions.canManageTeams && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<UserPlus size={16} />}
              onClick={() => openDriverModal(null, null)}
              disabled={teams.length === 0}
            >
              Пилот
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => openTeamModal(null)}>
              Команда
            </Button>
          </div>
        )}
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={<Flag size={36} />}
          title="Нет команд"
          description="Добавьте первую команду, чтобы начать формировать состав чемпионата."
          action={
            permissions.canManageTeams ? (
              <Button icon={<Plus size={16} />} onClick={() => openTeamModal(null)}>
                Создать команду
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          {permissions.canManageTeams && (
            <div className="bg-ink-card border border-ink-border rounded p-3 flex items-start gap-2 text-xs text-text-secondary">
              <GripVertical size={14} className="shrink-0 mt-0.5 text-lime-primary" />
              <span>
                Перетаскивайте пилотов между командами или в зону «Без команды».
                Кнопки редактирования и удаления работают как раньше.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {teams.map((team) => (
              <DroppableTeamCard
                key={team.id}
                team={team}
                drivers={driversByTeam.get(team.id) ?? []}
                draggingDriverId={activeDriverId}
                canManage={permissions.canManageTeams}
                onAddDriver={() => openDriverModal(null, team.id)}
                onEditTeam={() => openTeamModal(team)}
                onDeleteTeam={() => setConfirmDeleteTeam(team)}
                onEditDriver={(d) => openDriverModal(d)}
                onDeleteDriver={(d) => setConfirmDeleteDriver(d)}
              />
            ))}
          </div>

          <DroppableOrphansZone
            drivers={orphans}
            draggingDriverId={activeDriverId}
            canManage={permissions.canManageTeams}
            onEditDriver={(d) => openDriverModal(d)}
            onDeleteDriver={(d) => setConfirmDeleteDriver(d)}
          />

          <DragOverlay dropAnimation={null}>
            {activeDriver ? <DriverRowPreview driver={activeDriver} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <TeamModal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        championshipId={championshipId}
        team={editingTeam}
      />
      <DriverModal
        open={driverModalOpen}
        onClose={() => setDriverModalOpen(false)}
        championshipId={championshipId}
        driver={editingDriver}
        defaultTeamId={defaultTeamId}
        teams={teams}
      />

      <ConfirmDialog
        open={!!confirmDeleteTeam}
        title="Удалить команду?"
        message={
          confirmDeleteTeam
            ? `«${confirmDeleteTeam.name}» будет удалена. Пилоты команды останутся в чемпионате без команды.`
            : ''
        }
        destructive
        confirmLabel="Удалить"
        onConfirm={() => {
          if (confirmDeleteTeam) deleteTeam(confirmDeleteTeam);
          setConfirmDeleteTeam(null);
        }}
        onCancel={() => setConfirmDeleteTeam(null)}
      />
      <ConfirmDialog
        open={!!confirmDeleteDriver}
        title="Удалить пилота?"
        message={
          confirmDeleteDriver
            ? `${confirmDeleteDriver.firstName} ${confirmDeleteDriver.lastName} будет удалён.`
            : ''
        }
        destructive
        confirmLabel="Удалить"
        onConfirm={() => {
          if (confirmDeleteDriver) deleteDriver(confirmDeleteDriver);
          setConfirmDeleteDriver(null);
        }}
        onCancel={() => setConfirmDeleteDriver(null)}
      />
    </div>
  );
}

function declension(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return '';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'а';
  return 'ов';
}

/* ---------------- DnD-обёртки команд и зон ---------------- */

function DroppableTeamCard({
  team,
  drivers,
  draggingDriverId,
  canManage,
  onAddDriver,
  onEditTeam,
  onDeleteTeam,
  onEditDriver,
  onDeleteDriver,
}: {
  team: Team;
  drivers: Driver[];
  draggingDriverId: string | null;
  canManage: boolean;
  onAddDriver: () => void;
  onEditTeam: () => void;
  onDeleteTeam: () => void;
  onEditDriver: (d: Driver) => void;
  onDeleteDriver: (d: Driver) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: team.id });
  const draggingFromHere =
    draggingDriverId && drivers.some((d) => d.id === draggingDriverId);
  const showHighlight = isOver && !draggingFromHere;

  return (
    <div
      ref={setNodeRef}
      className={[
        'bg-ink-card border rounded overflow-hidden transition',
        showHighlight
          ? 'border-lime-primary ring-2 ring-lime-primary/40'
          : 'border-ink-border hover:border-lime-primary',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 p-4 border-b border-ink-border">
        <span
          className="w-1.5 h-12 rounded-sm shrink-0"
          style={{ backgroundColor: team.color }}
        />
        <Avatar src={team.logo} name={team.name} size={40} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold tracking-section uppercase truncate">
            {team.name}
          </h3>
          <span className="text-xs text-text-secondary tabular">
            {drivers.length} пилот{declension(drivers.length)}
          </span>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              icon={<UserPlus size={14} />}
              onClick={onAddDriver}
              aria-label="Добавить пилота"
            >
              <span className="sr-only">Добавить пилота</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil size={14} />}
              onClick={onEditTeam}
              aria-label="Редактировать"
            >
              <span className="sr-only">Редактировать</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={onDeleteTeam}
              aria-label="Удалить"
            >
              <span className="sr-only">Удалить</span>
            </Button>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 min-h-[80px]">
        {drivers.length === 0 ? (
          canManage ? (
            <button
              onClick={onAddDriver}
              className={[
                'border border-dashed rounded p-3 text-xs uppercase tracking-badge transition flex items-center justify-center gap-2',
                showHighlight
                  ? 'border-lime-primary text-lime-primary bg-lime-primary/5'
                  : 'border-ink-border text-text-secondary hover:border-lime-primary hover:text-lime-primary',
              ].join(' ')}
            >
              <Plus size={14} /> {showHighlight ? 'Перетащите сюда' : 'Добавить пилота'}
            </button>
          ) : (
            <div className="text-xs text-text-muted text-center py-4">Пилотов нет</div>
          )
        ) : (
          drivers.map((d) => (
            <DraggableDriverRow
              key={d.id}
              driver={d}
              canManage={canManage}
              onEdit={() => onEditDriver(d)}
              onDelete={() => onDeleteDriver(d)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DroppableOrphansZone({
  drivers,
  draggingDriverId,
  canManage,
  onEditDriver,
  onDeleteDriver,
}: {
  drivers: Driver[];
  draggingDriverId: string | null;
  canManage: boolean;
  onEditDriver: (d: Driver) => void;
  onDeleteDriver: (d: Driver) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: ORPHANS_ID });
  const isDragging = !!draggingDriverId;
  const draggingFromHere =
    draggingDriverId && drivers.some((d) => d.id === draggingDriverId);
  const showHighlight = isOver && !draggingFromHere;

  // Зона показывается всегда, если есть пилоты «без команды», и временно появляется
  // во время drag — даже если пуста, чтобы можно было освободить пилота.
  if (drivers.length === 0 && !isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className={[
        'bg-ink-card border rounded p-4 flex flex-col gap-2 transition',
        showHighlight
          ? 'border-lime-primary ring-2 ring-lime-primary/40'
          : drivers.length === 0
          ? 'border-dashed border-ink-border'
          : 'border-ink-border',
      ].join(' ')}
    >
      <h3 className="text-sm uppercase tracking-badge text-text-secondary">
        Без команды ({drivers.length})
      </h3>
      {drivers.length === 0 ? (
        <div className="text-xs text-text-muted text-center py-3 uppercase tracking-badge">
          {showHighlight ? 'Отпустите, чтобы освободить пилота' : 'Перетащите пилота сюда'}
        </div>
      ) : (
        drivers.map((d) => (
          <DraggableDriverRow
            key={d.id}
            driver={d}
            canManage={canManage}
            onEdit={() => onEditDriver(d)}
            onDelete={() => onDeleteDriver(d)}
          />
        ))
      )}
    </div>
  );
}

/* ---------------- Draggable пилот ---------------- */

function DraggableDriverRow({
  driver,
  canManage,
  onEdit,
  onDelete,
}: {
  driver: Driver;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: driver.id,
    disabled: !canManage,
  });

  return (
    <div
      ref={setNodeRef}
      {...(canManage ? attributes : {})}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 px-2 py-2 rounded hover:bg-ink-elevated transition group"
    >
      {canManage && (
        <button
          {...listeners}
          type="button"
          className="p-1 -ml-1 text-text-muted hover:text-lime-primary transition cursor-grab active:cursor-grabbing touch-none"
          aria-label="Перетащить пилота"
          title="Перетащить"
        >
          <GripVertical size={14} />
        </button>
      )}
      <Avatar src={driver.photo} name={`${driver.firstName} ${driver.lastName}`} size={36} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold flex items-center gap-1.5">
          {driver.firstName} {driver.lastName}
          {driver.country && <CountryFlag code={driver.country} size={12} />}
        </div>
        <div className="text-[11px] text-text-muted uppercase tracking-badge">
          # <span className="tabular">{driver.number}</span>
        </div>
      </div>
      {canManage && (
        <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-text-secondary hover:text-lime-primary transition"
            aria-label="Редактировать"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-text-secondary hover:text-danger transition"
            aria-label="Удалить"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Превью при drag ---------------- */

function DriverRowPreview({ driver }: { driver: Driver }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded bg-ink-elevated border border-lime-primary shadow-2xl pointer-events-none">
      <GripVertical size={14} className="text-lime-primary" />
      <Avatar src={driver.photo} name={`${driver.firstName} ${driver.lastName}`} size={32} />
      <div className="min-w-0">
        <div className="text-sm font-bold flex items-center gap-1.5">
          {driver.firstName} {driver.lastName}
          {driver.country && <CountryFlag code={driver.country} size={12} />}
        </div>
        <div className="text-[11px] text-text-muted uppercase tracking-badge">
          # <span className="tabular">{driver.number}</span>
        </div>
      </div>
    </div>
  );
}
