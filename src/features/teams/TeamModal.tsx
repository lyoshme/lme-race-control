import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useToast } from '@/components/toast/ToastContext';
import { uuid } from '@/lib/id';
import * as data from '@/lib/data';
import type { Team } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  championshipId: string;
  team?: Team | null;
}

export function TeamModal({ open, onClose, championshipId, team }: Props) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [color, setColor] = useState('#C6FF00');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(team?.name ?? '');
      setLogo(team?.logo ?? '');
      setColor(team?.color ?? '#C6FF00');
      setError('');
    }
  }, [open, team]);

  function save() {
    if (!name.trim()) {
      setError('Введите название');
      return;
    }
    setSaving(true);
    try {
      const list = data.getTeams(championshipId);
      if (team) {
        const updated = list.map((t) =>
          t.id === team.id ? { ...t, name: name.trim(), logo, color } : t,
        );
        data.setTeams(championshipId, updated);
        toast.success('Команда обновлена');
      } else {
        const newTeam: Team = {
          id: uuid(),
          championshipId,
          name: name.trim(),
          logo,
          color,
          driverIds: [],
        };
        data.setTeams(championshipId, [...list, newTeam]);
        toast.success('Команда добавлена');
      }
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={team ? 'Редактировать команду' : 'Новая команда'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={save} loading={saving}>
            {team ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-start">
          <FileDropzone
            value={logo}
            onChange={setLogo}
            label="Логотип"
            aspect="1/1"
            maxKB={200}
            maxDim={600}
          />
          <div className="flex flex-col gap-4">
            <Input
              label="Название"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              error={error}
              maxLength={50}
            />
            <ColorPicker label="Цвет команды" value={color} onChange={setColor} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
