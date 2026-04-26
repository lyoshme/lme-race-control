import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/toast/ToastContext';
import { useRouter } from '@/router';
import * as data from '@/lib/data';
import type { Championship, ChampionshipStatus, Discipline } from '@/types';
import { DISCIPLINE_LABELS } from '@/types';

interface Props {
  championship: Championship;
}

export function SettingsTab({ championship }: Props) {
  const toast = useToast();
  const { goHome } = useRouter();

  const [title, setTitle] = useState(championship.title);
  const [slogan, setSlogan] = useState(championship.slogan);
  const [description, setDescription] = useState(championship.description);
  const [discipline, setDiscipline] = useState<Discipline>(championship.discipline);
  const [disciplineCustom, setDisciplineCustom] = useState(championship.disciplineCustom ?? '');
  const [season, setSeason] = useState(championship.season);
  const [banner, setBanner] = useState(championship.banner);
  const [status, setStatus] = useState<ChampionshipStatus>(championship.status);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  function save() {
    if (!title.trim()) {
      toast.error('Название не может быть пустым');
      return;
    }
    setSaving(true);
    try {
      data.setChampionship({
        ...championship,
        title: title.trim(),
        slogan: slogan.trim(),
        description: description.trim(),
        discipline,
        disciplineCustom: discipline === 'custom' ? disciplineCustom.trim() : undefined,
        season: season.trim(),
        banner,
        status,
      });
      toast.success('Сохранено');
    } catch (e) {
      console.error(e);
      toast.error('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    data.removeChampionship(championship.id);
    toast.success('Чемпионат удалён');
    goHome();
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <div className="bg-ink-card border border-ink-border rounded p-5 flex flex-col gap-4">
        <h2 className="text-base uppercase tracking-section font-bold">Основные данные</h2>
        <FileDropzone value={banner} onChange={setBanner} label="Баннер" aspect="21/9" maxKB={500} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Название"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
          <Input
            label="Слоган"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            maxLength={80}
          />
          <Select
            label="Дисциплина"
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline)}
          >
            {(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => (
              <option key={d} value={d}>
                {DISCIPLINE_LABELS[d]}
              </option>
            ))}
          </Select>
          <Input
            label="Сезон"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            maxLength={20}
          />
          {discipline === 'custom' && (
            <Input
              label="Своя дисциплина"
              value={disciplineCustom}
              onChange={(e) => setDisciplineCustom(e.target.value)}
              maxLength={40}
            />
          )}
          <Select
            label="Статус"
            value={status}
            onChange={(e) => setStatus(e.target.value as ChampionshipStatus)}
          >
            <option value="active">Активен</option>
            <option value="finished">Завершён</option>
          </Select>
        </div>
        <Textarea
          label="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={2000}
        />
        <div className="flex justify-end pt-2">
          <Button icon={<Save size={16} />} onClick={save} loading={saving}>
            Сохранить
          </Button>
        </div>
      </div>

      <div className="bg-ink-card border border-danger/30 rounded p-5 flex flex-col gap-3">
        <h2 className="text-base uppercase tracking-section font-bold text-danger">
          Опасная зона
        </h2>
        <p className="text-sm text-text-secondary">
          Удаление чемпионата необратимо: будут стёрты команды, пилоты, система очков, таблицы и история этапов.
        </p>
        <div>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirmDelete(true)}>
            Удалить чемпионат
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить чемпионат?"
        message={`«${championship.title}» и все связанные данные будут безвозвратно удалены.`}
        confirmLabel="Удалить"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          handleDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
