import { useMemo } from 'react';
import { Check, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CountryFlag } from '@/components/ui/CountryFlag';
import type { Driver, Team } from '@/types';

interface Props {
  drivers: Driver[]; // eligible (в standings)
  teams: Team[];
  participantIds: string[];
  onChange: (ids: string[]) => void;
}

export function ParticipantsStep({
  drivers,
  teams,
  participantIds,
  onChange,
}: Props) {
  const selected = useMemo(() => new Set(participantIds), [participantIds]);

  const grouped = useMemo(() => {
    const byTeam = new Map<string | null, Driver[]>();
    for (const d of drivers) {
      const key = d.teamId ?? null;
      const arr = byTeam.get(key) ?? [];
      arr.push(d);
      byTeam.set(key, arr);
    }
    return byTeam;
  }, [drivers]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }
  function selectAll() {
    onChange(drivers.map((d) => d.id));
  }
  function selectNone() {
    onChange([]);
  }

  function toggleTeam(teamId: string | null) {
    const teamDrivers = grouped.get(teamId) ?? [];
    const allSelected = teamDrivers.every((d) => selected.has(d.id));
    const next = new Set(selected);
    for (const d of teamDrivers) {
      if (allSelected) next.delete(d.id);
      else next.add(d.id);
    }
    onChange([...next]);
  }

  if (drivers.length === 0) {
    return (
      <div className="text-center py-6 text-text-muted text-sm">
        В чемпионате нет пилотов, допущенных к этапам.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Users size={16} className="text-lime-primary" />
          <span className="font-bold tabular">{participantIds.length}</span>
          <span className="text-text-secondary">из {drivers.length}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Все
          </Button>
          <Button variant="ghost" size="sm" onClick={selectNone}>
            Снять
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 max-h-[55dvh] overflow-y-auto pr-1">
        {teams.map((team) => {
          const teamDrivers = grouped.get(team.id) ?? [];
          if (teamDrivers.length === 0) return null;
          const allSelected = teamDrivers.every((d) => selected.has(d.id));
          const someSelected =
            !allSelected && teamDrivers.some((d) => selected.has(d.id));
          return (
            <div
              key={team.id}
              className="bg-ink-card border border-ink-border rounded overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleTeam(team.id)}
                className="w-full flex items-center gap-3 px-3 py-2 border-b border-ink-border hover:bg-ink-elevated transition text-left"
              >
                <Checkbox checked={allSelected} indeterminate={someSelected} />
                <span
                  className="w-1 h-7 rounded-sm shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <Avatar src={team.logo} name={team.name} size={28} />
                <span className="font-bold text-sm flex-1 truncate">
                  {team.name}
                </span>
                <span className="text-2xs tabular text-text-muted uppercase tracking-badge">
                  {teamDrivers.filter((d) => selected.has(d.id)).length}/
                  {teamDrivers.length}
                </span>
              </button>
              <div className="p-2 flex flex-col gap-1">
                {teamDrivers.map((d) => (
                  <DriverCheckRow
                    key={d.id}
                    driver={d}
                    checked={selected.has(d.id)}
                    onToggle={() => toggle(d.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* «Без команды» */}
        {(() => {
          const orphans = grouped.get(null) ?? [];
          if (orphans.length === 0) return null;
          const allSelected = orphans.every((d) => selected.has(d.id));
          const someSelected =
            !allSelected && orphans.some((d) => selected.has(d.id));
          return (
            <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
              <button
                type="button"
                onClick={() => toggleTeam(null)}
                className="w-full flex items-center gap-3 px-3 py-2 border-b border-ink-border hover:bg-ink-elevated transition text-left"
              >
                <Checkbox checked={allSelected} indeterminate={someSelected} />
                <span className="font-bold text-sm flex-1">Без команды</span>
                <span className="text-2xs tabular text-text-muted uppercase tracking-badge">
                  {orphans.filter((d) => selected.has(d.id)).length}/
                  {orphans.length}
                </span>
              </button>
              <div className="p-2 flex flex-col gap-1">
                {orphans.map((d) => (
                  <DriverCheckRow
                    key={d.id}
                    driver={d}
                    checked={selected.has(d.id)}
                    onToggle={() => toggle(d.id)}
                  />
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function DriverCheckRow({
  driver,
  checked,
  onToggle,
}: {
  driver: Driver;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'flex items-center gap-3 px-2 py-2 rounded transition text-left w-full',
        checked
          ? 'bg-lime-primary/5 border border-lime-primary/30'
          : 'border border-transparent hover:bg-ink-elevated',
      ].join(' ')}
    >
      <Checkbox checked={checked} />
      <Avatar src={driver.photo} name={`${driver.firstName} ${driver.lastName}`} size={28} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold flex items-center gap-1.5">
          {driver.firstName} {driver.lastName}
          {driver.country && <CountryFlag code={driver.country} size={11} />}
        </div>
      </div>
      <span className="text-xs tabular text-text-secondary">#{driver.number}</span>
    </button>
  );
}

function Checkbox({
  checked,
  indeterminate,
}: {
  checked: boolean;
  indeterminate?: boolean;
}) {
  return (
    <span
      className={[
        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition',
        checked || indeterminate
          ? 'bg-lime-primary border-lime-primary'
          : 'bg-ink-surface border-ink-border',
      ].join(' ')}
    >
      {indeterminate ? (
        <span className="w-2 h-px bg-ink-deep" />
      ) : checked ? (
        <Check size={11} className="text-ink-deep" strokeWidth={3} />
      ) : null}
    </span>
  );
}
