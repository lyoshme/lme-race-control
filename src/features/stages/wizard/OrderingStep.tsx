import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Flag, Zap, Trophy } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { calcResultPoints } from '@/lib/standingsCalc';
import type { Driver, ScoringSystem, Team } from '@/types';

interface Props {
  orderedIds: string[];
  setOrderedIds: (ids: string[]) => void;
  driverMap: Map<string, Driver>;
  teamMap: Map<string, Team>;
  poleId: string | null;
  setPoleId: (id: string | null) => void;
  fastestLapId: string | null;
  setFastestLapId: (id: string | null) => void;
  scoring: ScoringSystem;
}

export function OrderingStep({
  orderedIds,
  setOrderedIds,
  driverMap,
  teamMap,
  poleId,
  setPoleId,
  fastestLapId,
  setFastestLapId,
  scoring,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setOrderedIds(arrayMove(orderedIds, oldIndex, newIndex));
  }

  const activeDriver = activeId ? driverMap.get(activeId) ?? null : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-ink-card border border-ink-border rounded p-3 flex items-start gap-2 text-xs text-text-secondary">
        <GripVertical size={14} className="shrink-0 mt-0.5 text-lime-primary" />
        <span>
          Перетаскивайте пилотов для расстановки финишных позиций.
          Слева — кнопки <Flag size={11} className="inline -mt-0.5 text-lime-primary" />{' '}
          для pole position и{' '}
          <Zap size={11} className="inline -mt-0.5 text-lime-primary" /> для fastest lap
          (по одному на этап).
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {orderedIds.map((id, idx) => {
              const driver = driverMap.get(id);
              if (!driver) return null;
              const team = driver.teamId ? teamMap.get(driver.teamId) ?? null : null;
              const position = idx + 1;
              const pole = id === poleId;
              const fl = id === fastestLapId;
              const points = calcResultPoints(scoring, position, pole, fl);
              return (
                <SortableRow
                  key={id}
                  id={id}
                  position={position}
                  driver={driver}
                  team={team}
                  points={points}
                  pole={pole}
                  fl={fl}
                  onTogglePole={() => setPoleId(pole ? null : id)}
                  onToggleFL={() => setFastestLapId(fl ? null : id)}
                />
              );
            })}
          </div>
        </SortableContext>
        {/* Стандартная drop-анимация dnd-kit: отпущенная строка доезжает до своей позиции */}
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }}>
          {activeDriver ? (
            <div className="bg-ink-elevated border border-lime-primary rounded shadow-2xl px-3 py-2 flex items-center gap-2">
              <GripVertical size={14} className="text-lime-primary" />
              <Avatar
                src={activeDriver.photo}
                name={`${activeDriver.firstName} ${activeDriver.lastName}`}
                size={28}
              />
              <span className="text-sm font-bold">
                {activeDriver.firstName} {activeDriver.lastName}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableRow({
  id,
  position,
  driver,
  team,
  points,
  pole,
  fl,
  onTogglePole,
  onToggleFL,
}: {
  id: string;
  position: number;
  driver: Driver;
  team: Team | null;
  points: number;
  pole: boolean;
  fl: boolean;
  onTogglePole: () => void;
  onToggleFL: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isTop3 = position <= 3;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      aria-label={`Переместить: ${driver.firstName} ${driver.lastName}`}
      className={[
        // Вся строка — зона захвата (grip остаётся визуальной подсказкой)
        'flex items-center gap-2 px-2 py-2 rounded border transition',
        'touch-none cursor-grab active:cursor-grabbing',
        isTop3
          ? 'bg-lime-primary/5 border-lime-primary/30'
          : 'bg-ink-card border-ink-border',
      ].join(' ')}
    >
      <span className="p-1 text-text-muted" aria-hidden="true">
        <GripVertical size={14} />
      </span>
      <span
        className={[
          'tabular font-bold w-8 text-center',
          isTop3 ? 'text-lime-primary text-base' : 'text-text-secondary text-sm',
        ].join(' ')}
      >
        {position}
      </span>
      {team && (
        <span
          className="w-1 h-8 rounded-sm shrink-0"
          style={{ backgroundColor: team.color }}
        />
      )}
      <Avatar src={driver.photo} name={`${driver.firstName} ${driver.lastName}`} size={32} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold flex items-center gap-1.5">
          {driver.firstName} {driver.lastName}
          {driver.country && <CountryFlag code={driver.country} size={11} />}
        </div>
        <div className="text-2xs text-text-muted uppercase tracking-badge flex items-center gap-2">
          <span className="tabular">#{driver.number}</span>
          {team && <span className="truncate">{team.name}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onTogglePole}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        title="Pole position"
        aria-label={`Pole position для ${driver.firstName} ${driver.lastName}`}
        className={[
          'p-1.5 rounded border transition',
          pole
            ? 'bg-lime-primary text-ink-deep border-lime-primary'
            : 'border-ink-border text-text-muted hover:text-lime-primary hover:border-lime-primary',
        ].join(' ')}
      >
        <Flag size={13} />
      </button>
      <button
        type="button"
        onClick={onToggleFL}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        title="Fastest lap"
        aria-label={`Fastest lap для ${driver.firstName} ${driver.lastName}`}
        className={[
          'p-1.5 rounded border transition',
          fl
            ? 'bg-lime-primary text-ink-deep border-lime-primary'
            : 'border-ink-border text-text-muted hover:text-lime-primary hover:border-lime-primary',
        ].join(' ')}
      >
        <Zap size={13} />
      </button>
      <span
        className={[
          'tabular font-bold w-10 text-right text-sm',
          points > 0 ? 'text-lime-primary' : 'text-text-muted',
        ].join(' ')}
      >
        {points > 0 ? `+${points}` : '0'}
      </span>
      {position === 1 && (
        <Trophy size={14} className="text-lime-primary shrink-0" />
      )}
    </div>
  );
}
