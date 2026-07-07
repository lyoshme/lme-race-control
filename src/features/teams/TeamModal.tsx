import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useToast } from '@/components/toast/ToastContext';
import * as api from '@/lib/api';
import type { Team } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  championshipId: string;
  seasonId: string;
  team?: Team | null;
}

export function TeamModal({ open, onClose, championshipId, seasonId, team }: Props) {
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

  async function save() {
    if (!name.trim()) {
      setError('Введите название');
      return;
    }
    setSaving(true);
    try {
      // Загружаем логотип в Storage если он base64
      let logoUrl = '';
      if (logo.startsWith('data:')) {
        logoUrl = await api.uploads.uploadImage('logos', logo);
      } else if (logo) {
        logoUrl = logo;
      }

      if (team) {
        await api.teams.update(team.id, {
          name: name.trim(),
          logo: logoUrl,
          color,
        });
        toast.success('Команда обновлена');
      } else {
        await api.teams.create({
          championshipId,
          seasonId,
          name: name.trim(),
          logo: logoUrl,
          color,
          driverIds: [],
        });
        toast.success('Команда добавлена');
      }
      onClose();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Не удалось сохранить';
      toast.error(msg);
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
