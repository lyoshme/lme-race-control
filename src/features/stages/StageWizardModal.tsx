import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Flag, Trophy, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/toast/ToastContext';
import * as api from '@/lib/api';
import { applyStageToStandings, buildStageResults } from '@/lib/standingsCalc';
import type {
  Driver,
  ScoringSystem,
  Stage,
  StageType,
  Standings,
  Team,
} from '@/types';
import { ParticipantsStep } from './wizard/ParticipantsStep';
import { OrderingStep } from './wizard/OrderingStep';
import { ConfirmStep } from './wizard/ConfirmStep';

interface Props {
  open: boolean;
  onClose: () => void;
  championshipId: string;
}

type Step = 1 | 2 | 3 | 4;

const STEP_TITLES: Record<Step, string> = {
  1: 'Параметры этапа',
  2: 'Участники',
  3: 'Расстановка по местам',
  4: 'Подтверждение',
};

const TYPE_LABELS: Record<StageType, string> = {
  race: 'Гонка',
  qualifying: 'Квалификация',
  sprint: 'Спринт',
};

export function StageWizardModal({ open, onClose, championshipId }: Props) {
  const toast = useToast();

  // Данные чемпионата
  const [teams, setTeams] = useState<Team[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [scorings, setScorings] = useState<ScoringSystem[]>([]);
  const [standings, setStandings] = useState<Standings | null>(null);

  // Шаг 1 — параметры
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [track, setTrack] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<StageType>('race');
  const [scoringId, setScoringId] = useState('');

  // Шаг 2 — участники
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  // Шаг 3 — порядок и бонусы
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [poleId, setPoleId] = useState<string | null>(null);
  const [fastestLapId, setFastestLapId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Загрузка данных при открытии
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (async () => {
      try {
        const [t, d, sc, st] = await Promise.all([
          api.teams.list(championshipId),
          api.drivers.list(championshipId),
          api.scoring.list(championshipId),
          api.standings.get(championshipId),
        ]);
        if (!alive) return;
        setTeams(t);
        setDrivers(d);
        setScorings(sc);
        setStandings(st);
        setScoringId(sc[0]?.id ?? '');
      } catch (e) {
        console.error(e);
      }
    })();

    // reset wizard state
    setStep(1);
    setName('');
    setTrack('');
    setDate(new Date().toISOString().slice(0, 10));
    setType('race');
    setParticipantIds([]);
    setOrderedIds([]);
    setPoleId(null);
    setFastestLapId(null);
    setErrors({});

    return () => {
      alive = false;
    };
  }, [open, championshipId]);

  // Eligible — пилоты в standings (initialized)
  const eligibleDrivers = useMemo(() => {
    if (!standings?.initialized) return [];
    return drivers.filter((d) => d.id in standings.driverPoints);
  }, [drivers, standings]);

  // По умолчанию — все eligible как участники
  useEffect(() => {
    if (open && eligibleDrivers.length > 0 && participantIds.length === 0) {
      setParticipantIds(eligibleDrivers.map((d) => d.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eligibleDrivers.length]);

  const driverMap = useMemo(
    () => new Map(drivers.map((d) => [d.id, d])),
    [drivers],
  );
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const scoring = useMemo(
    () => scorings.find((s) => s.id === scoringId) ?? null,
    [scorings, scoringId],
  );

  // Валидация шагов
  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Укажите название этапа';
    if (!track.trim()) e.track = 'Укажите трассу';
    if (!date) e.date = 'Укажите дату';
    if (!scoringId) e.scoringId = 'Выберите систему очков';
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function validateStep2(): boolean {
    if (participantIds.length === 0) {
      toast.error('Выберите хотя бы одного пилота');
      return false;
    }
    return true;
  }
  function validateStep3(): boolean {
    if (orderedIds.length !== participantIds.length) {
      toast.error('Расставьте всех участников');
      return false;
    }
    return true;
  }

  function next() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;

    if (step === 2) {
      // Инициализируем порядок при переходе на шаг 3
      setOrderedIds((prev) => {
        // Если уже расставляли — оставляем, дополняя/обрезая
        const set = new Set(participantIds);
        const kept = prev.filter((id) => set.has(id));
        const missing = participantIds.filter((id) => !kept.includes(id));
        return [...kept, ...missing];
      });
      // Сбросим pole/fastestLap если их нет среди участников
      setPoleId((cur) => (cur && participantIds.includes(cur) ? cur : null));
      setFastestLapId((cur) =>
        cur && participantIds.includes(cur) ? cur : null,
      );
    }
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  }
  function prev() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function save() {
    if (!scoring || !standings) return;
    setBusy(true);
    try {
      const driverTeamMap = new Map(drivers.map((d) => [d.id, d.teamId]));
      const results = buildStageResults({
        scoring,
        orderedDriverIds: orderedIds,
        poleDriverId: poleId,
        fastestLapDriverId: fastestLapId,
        driverTeamMap,
      });

      const stagePayload: Omit<Stage, 'id' | 'createdAt'> = {
        championshipId,
        name: name.trim(),
        track: track.trim(),
        date,
        type,
        scoringId,
        participantIds,
        results,
      };

      // Сохраняем этап
      const created = await api.stages.create(stagePayload);

      // Применяем к standings
      const nextStandings = applyStageToStandings(standings, results);
      await api.standings.upsert(nextStandings);

      toast.success(`Этап «${created.name}» добавлен`);
      onClose();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Не удалось сохранить этап';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const noScoring = scorings.length === 0;
  const notInitialized = !standings?.initialized;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Новый этап — шаг ${step}/4: ${STEP_TITLES[step]}`}
      size="lg"
      footer={
        <>
          {step > 1 && (
            <Button
              variant="ghost"
              icon={<ChevronLeft size={16} />}
              onClick={prev}
              disabled={busy}
            >
              Назад
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          {step < 4 ? (
            <Button
              onClick={next}
              disabled={noScoring || notInitialized}
              icon={<ChevronRight size={16} />}
              iconRight
            >
              Далее
            </Button>
          ) : (
            <Button
              icon={<Check size={16} />}
              onClick={save}
              loading={busy}
            >
              Сохранить этап
            </Button>
          )}
        </>
      }
    >
      {notInitialized ? (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <Flag size={36} className="text-text-muted" />
          <h3 className="text-base uppercase tracking-section font-bold">
            Сначала инициализируйте таблицы
          </h3>
          <p className="text-sm text-text-secondary max-w-md">
            Перед проведением этапов выберите команды-участники и инициализируйте
            таблицы во вкладке «Таблицы».
          </p>
        </div>
      ) : noScoring ? (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <Trophy size={36} className="text-text-muted" />
          <h3 className="text-base uppercase tracking-section font-bold">
            Нет системы очков
          </h3>
          <p className="text-sm text-text-secondary max-w-md">
            Создайте хотя бы одну систему очков во вкладке «Система очков».
          </p>
        </div>
      ) : (
        <>
          <StepIndicator step={step} />
          {step === 1 && (
            <Step1Params
              name={name}
              setName={setName}
              track={track}
              setTrack={setTrack}
              date={date}
              setDate={setDate}
              type={type}
              setType={setType}
              scoringId={scoringId}
              setScoringId={setScoringId}
              scorings={scorings}
              errors={errors}
            />
          )}
          {step === 2 && (
            <ParticipantsStep
              drivers={eligibleDrivers}
              teams={teams}
              participantIds={participantIds}
              onChange={setParticipantIds}
            />
          )}
          {step === 3 && scoring && (
            <OrderingStep
              orderedIds={orderedIds}
              setOrderedIds={setOrderedIds}
              driverMap={driverMap}
              teamMap={teamMap}
              poleId={poleId}
              setPoleId={setPoleId}
              fastestLapId={fastestLapId}
              setFastestLapId={setFastestLapId}
              scoring={scoring}
            />
          )}
          {step === 4 && scoring && (
            <ConfirmStep
              name={name}
              track={track}
              date={date}
              type={type}
              typeLabel={TYPE_LABELS[type]}
              scoring={scoring}
              orderedIds={orderedIds}
              driverMap={driverMap}
              teamMap={teamMap}
              poleId={poleId}
              fastestLapId={fastestLapId}
            />
          )}
        </>
      )}
    </Modal>
  );
}

/* ---------------- Шаги ---------------- */

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = [1, 2, 3, 4];
  return (
    <div className="flex items-center gap-2 mb-5 -mt-1">
      {steps.map((s, idx) => {
        const done = s < step;
        const active = s === step;
        return (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold tabular shrink-0 transition',
                done
                  ? 'bg-lime-primary text-ink-deep'
                  : active
                  ? 'border-2 border-lime-primary text-lime-primary'
                  : 'border border-ink-border text-text-muted',
              ].join(' ')}
            >
              {done ? <Check size={14} /> : s}
            </div>
            <div className="flex-1 hidden sm:block">
              <div
                className={[
                  'text-[11px] uppercase tracking-badge transition',
                  active ? 'text-lime-primary' : 'text-text-muted',
                ].join(' ')}
              >
                {STEP_TITLES[s]}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={[
                  'h-px flex-1 transition',
                  done ? 'bg-lime-primary' : 'bg-ink-border',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Step1Params(props: {
  name: string;
  setName: (v: string) => void;
  track: string;
  setTrack: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  type: StageType;
  setType: (v: StageType) => void;
  scoringId: string;
  setScoringId: (v: string) => void;
  scorings: ScoringSystem[];
  errors: Record<string, string>;
}) {
  const {
    name,
    setName,
    track,
    setTrack,
    date,
    setDate,
    type,
    setType,
    scoringId,
    setScoringId,
    scorings,
    errors,
  } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="md:col-span-2">
        <Input
          label="Название этапа"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Гран-при Монако"
          maxLength={80}
        />
      </div>
      <Input
        label="Трасса"
        required
        value={track}
        onChange={(e) => setTrack(e.target.value)}
        error={errors.track}
        placeholder="Circuit de Monaco"
        maxLength={80}
      />
      <Input
        label="Дата"
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
      />
      <Select
        label="Тип"
        value={type}
        onChange={(e) => setType(e.target.value as StageType)}
      >
        <option value="race">Гонка</option>
        <option value="qualifying">Квалификация</option>
        <option value="sprint">Спринт</option>
      </Select>
      <Select
        label="Система очков"
        required
        value={scoringId}
        onChange={(e) => setScoringId(e.target.value)}
        error={errors.scoringId}
      >
        {scorings.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} (1-е: {s.points[0] ?? 0} очков
            {s.bonusPole > 0 && `, pole +${s.bonusPole}`}
            {s.bonusFastestLap > 0 && `, fastest lap +${s.bonusFastestLap}`})
          </option>
        ))}
      </Select>
      <div className="md:col-span-2 bg-ink-elevated border border-ink-border rounded p-3 flex items-start gap-2 text-xs text-text-secondary">
        <Zap size={14} className="shrink-0 mt-0.5 text-lime-primary" />
        <span>
          На следующих шагах выберите участников этапа, расставите их по местам
          через drag-and-drop и отметите pole position и fastest lap (опционально).
        </span>
      </div>
    </div>
  );
}
