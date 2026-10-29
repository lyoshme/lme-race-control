import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/toast/ToastContext';
import * as api from '@/lib/api';
import type { AwardKind, Driver, SeasonAward, Team } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  championshipId: string;
  seasonId: string;
  award?: SeasonAward | null;
  drivers: Driver[];
  teams: Team[];
}

interface Errors {
  name?: string;
}

export function AwardModal({
  open,
  onClose,
  championshipId,
  seasonId,
  award,
  drivers,
  teams,
}: Props) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AwardKind>('driver');
  const [winnerId, setWinnerId] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (open) {
      setName(award?.name ?? '');
      setKind(award?.kind ?? 'driver');
      setWinnerId(award?.winnerDriverId ?? award?.winnerTeamId ?? '');
      setErrors({});
      setConfirmClose(false);
    }
  }, [open, award]);

  const dirty =
    name !== (award?.name ?? '') ||
    kind !== (award?.kind ?? 'driver') ||
    winnerId !== (award?.winnerDriverId ?? award?.winnerTeamId ?? '');

  function validate(): boolean {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Введите название номинации';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      // Победитель всегда под тип номинации: при смене типа в БД
      // гарантированно не остаётся «чужого» победителя (см. CHECK
      // award_winner_kind_check в миграции 0070).
      const winnerDriverId = kind === 'driver' ? winnerId || null : null;
      const winnerTeamId = kind === 'team' ? winnerId || null : null;

      if (award) {
        await api.awards.update(award.id, { name, kind, winnerDriverId, winnerTeamId });
      } else {
        await api.awards.create({
          championshipId,
          seasonId,
          name,
          kind,
          winnerDriverId,
          winnerTeamId,
        });
      }

      toast.success(award ? 'Номинация обновлена' : 'Номинация добавлена');
      onClose();
    } catch (e2) {
      console.error(e2);
      const msg = e2 instanceof Error ? e2.message : 'Не удалось сохранить';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        onBeforeClose={() => {
          if (dirty) {
            setConfirmClose(true);
            return false;
          }
          return true;
        }}
        title={award ? 'Редактировать номинацию' : 'Новая номинация'}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving}>
              {award ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Название номинации"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            maxLength={60}
            placeholder="Лучший обгон сезона"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Тип"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as AwardKind);
                setWinnerId('');
              }}
            >
              <option value="driver">Пилот</option>
              <option value="team">Команда</option>
            </Select>
            <Select
              label="Победитель"
              value={winnerId}
              onChange={(e) => setWinnerId(e.target.value)}
            >
              <option value="">— Победитель не определён —</option>
              {kind === 'driver' ? (
                drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {`#${d.number} ${d.firstName} ${d.lastName}`}
                  </option>
                ))
              ) : (
                teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              )}
            </Select>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmClose}
        title="Закрыть без сохранения?"
        message="Изменения номинации будут потеряны."
        confirmLabel="Закрыть"
        cancelLabel="Продолжить работу"
        destructive
        onConfirm={() => {
          setConfirmClose(false);
          onClose();
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </>
  );
}
