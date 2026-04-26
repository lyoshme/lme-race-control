import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { useToast } from '@/components/toast/ToastContext';
import { uuid } from '@/lib/id';
import * as data from '@/lib/data';
import type { Driver, Team } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  championshipId: string;
  driver?: Driver | null;
  defaultTeamId?: string | null;
  teams: Team[];
}

interface Errors {
  firstName?: string;
  lastName?: string;
  number?: string;
}

export function DriverModal({
  open,
  onClose,
  championshipId,
  driver,
  defaultTeamId,
  teams,
}: Props) {
  const toast = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState('');
  const [country, setCountry] = useState('RU');
  const [photo, setPhoto] = useState('');
  const [teamId, setTeamId] = useState<string | ''>('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName(driver?.firstName ?? '');
      setLastName(driver?.lastName ?? '');
      setNumber(driver?.number ?? '');
      setCountry(driver?.country ?? 'RU');
      setPhoto(driver?.photo ?? '');
      setTeamId(driver?.teamId ?? defaultTeamId ?? '');
      setErrors({});
    }
  }, [open, driver, defaultTeamId]);

  function validate(): boolean {
    const e: Errors = {};
    if (!firstName.trim()) e.firstName = 'Введите имя';
    if (!lastName.trim()) e.lastName = 'Введите фамилию';
    if (!number.trim()) e.number = 'Укажите номер';
    else if (!/^\d{1,3}$/.test(number.trim())) e.number = 'Только цифры (до 3)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const drivers = data.getDrivers(championshipId);
      const teams = data.getTeams(championshipId);
      const newTeamId = teamId || null;

      let updatedDrivers: Driver[];
      if (driver) {
        updatedDrivers = drivers.map((d) =>
          d.id === driver.id
            ? {
                ...d,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                number: number.trim(),
                country,
                photo,
                teamId: newTeamId,
              }
            : d,
        );
      } else {
        const newDriver: Driver = {
          id: uuid(),
          championshipId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          number: number.trim(),
          country,
          photo,
          teamId: newTeamId,
        };
        updatedDrivers = [...drivers, newDriver];
      }

      data.setDrivers(championshipId, updatedDrivers);

      // Синхронизация Team.driverIds
      const driverId = driver?.id ?? updatedDrivers[updatedDrivers.length - 1].id;
      const updatedTeams: Team[] = teams.map((t) => ({
        ...t,
        driverIds:
          t.id === newTeamId
            ? Array.from(new Set([...t.driverIds.filter((id) => id !== driverId), driverId]))
            : t.driverIds.filter((id) => id !== driverId),
      }));
      data.setTeams(championshipId, updatedTeams);

      toast.success(driver ? 'Пилот обновлён' : 'Пилот добавлен');
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
      title={driver ? 'Редактировать пилота' : 'Новый пилот'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={save} loading={saving}>
            {driver ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-start">
        <FileDropzone
          value={photo}
          onChange={setPhoto}
          label="Фото"
          aspect="1/1"
          maxKB={200}
          maxDim={600}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Имя"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.firstName}
            maxLength={40}
          />
          <Input
            label="Фамилия"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={errors.lastName}
            maxLength={40}
          />
          <Input
            label="Гоночный номер"
            required
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            error={errors.number}
            inputMode="numeric"
            className="tabular text-lg"
            placeholder="44"
          />
          <CountrySelect
            label="Национальность"
            value={country}
            onChange={setCountry}
            clearable
          />
          <div className="md:col-span-2">
            <Select label="Команда" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">— Без команды —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
