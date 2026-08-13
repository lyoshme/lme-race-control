import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { useToast } from '@/components/toast/ToastContext';
import { useRouter } from '@/router';
import * as api from '@/lib/api';
import { DISCIPLINE_LABELS } from '@/types';
import type { Discipline } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Errors {
  title?: string;
  description?: string;
  season?: string;
  disciplineCustom?: string;
}

export function CreateChampionshipModal({ open, onClose }: Props) {
  const toast = useToast();
  const { goManage } = useRouter();

  const [title, setTitle] = useState('');
  const [slogan, setSlogan] = useState('');
  const [description, setDescription] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('formula1');
  const [disciplineCustom, setDisciplineCustom] = useState('');
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [banner, setBanner] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle('');
    setSlogan('');
    setDescription('');
    setDiscipline('formula1');
    setDisciplineCustom('');
    setSeason(String(new Date().getFullYear()));
    setBanner('');
    setErrors({});
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!title.trim()) e.title = 'Введите название';
    else if (title.trim().length < 3) e.title = 'Минимум 3 символа';
    if (!description.trim()) e.description = 'Введите описание';
    else if (description.trim().split('\n').length < 1 || description.trim().length < 10)
      e.description = 'Минимум 10 символов';
    if (!season.trim()) e.season = 'Укажите сезон';
    if (discipline === 'custom' && !disciplineCustom.trim())
      e.disciplineCustom = 'Укажите дисциплину';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      // Если баннер пришёл как data-URL — заливаем в Storage и получаем URL.
      let bannerUrl = '';
      if (banner.startsWith('data:')) {
        bannerUrl = await api.uploads.uploadImage('banners', banner);
      } else if (banner) {
        bannerUrl = banner;
      }

      const created = await api.championships.create({
        title: title.trim(),
        slogan: slogan.trim(),
        description: description.trim(),
        discipline,
        disciplineCustom:
          discipline === 'custom' ? disciplineCustom.trim() : undefined,
        season: season.trim(),
        banner: bannerUrl,
      });

      toast.success('Отправлено на модерацию');
      reset();
      onClose();
      goManage(created.id);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Не удалось сохранить чемпионат';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (saving) return;
        // Черновик намеренно сохраняется до успешной отправки —
        // случайное закрытие не теряет введённое.
        onClose();
      }}
      title="Новый чемпионат"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Создать
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FileDropzone
            value={banner}
            onChange={setBanner}
            label="Баннер"
            aspect="21/9"
            maxKB={500}
            hint="JPG или PNG, до 500 КБ. Будет автоматически сжат."
          />
        </div>
        <Input
          label="Название"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Гран-при России 2026"
          error={errors.title}
          maxLength={80}
        />
        <Input
          label="Слоган"
          value={slogan}
          onChange={(e) => setSlogan(e.target.value)}
          placeholder="Скорость, азарт, точность"
          maxLength={80}
        />
        <Select
          label="Дисциплина"
          required
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value as Discipline)}
        >
          {(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => (
            <option key={d} value={d}>
              {DISCIPLINE_LABELS[d]}
            </option>
          ))}
        </Select>
        {discipline === 'custom' ? (
          <Input
            label="Своя дисциплина"
            required
            value={disciplineCustom}
            onChange={(e) => setDisciplineCustom(e.target.value)}
            error={errors.disciplineCustom}
            maxLength={40}
          />
        ) : (
          <Input
            label="Сезон / год"
            required
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            error={errors.season}
            maxLength={20}
          />
        )}
        {discipline === 'custom' && (
          <Input
            label="Сезон / год"
            required
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            error={errors.season}
            maxLength={20}
          />
        )}
        <div className="md:col-span-2">
          <Textarea
            label="Описание"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Расскажите о формате чемпионата, регламенте, особенностях…"
            rows={4}
            error={errors.description}
            maxLength={2000}
          />
        </div>
      </div>
    </Modal>
  );
}
