import { useCallback, useEffect, useState } from 'react';
import { Shield, ShieldAlert, Plus, Trash2, Key, Copy, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/toast/ToastContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/api';
import type { ChampionshipEditor, ChampionshipInvite } from '@/types';

interface Props {
  championshipId: string;
}

export function EditorsTab({ championshipId }: Props) {
  const toast = useToast();

  // Список редакторов
  const editorsFetcher = useCallback(() => api.editors.list(championshipId), [championshipId]);
  const { data: editors, loading: loadingEditors } = useSupabaseQuery<ChampionshipEditor[]>(
    editorsFetcher,
    [{ table: 'championship_editors', filter: `championship_id=eq.${championshipId}` }],
    [championshipId]
  );

  // Список инвайтов
  const [invites, setInvites] = useState<ChampionshipInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);

  // Состояние модалок
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editPermissionsModalOpen, setEditPermissionsModalOpen] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState<ChampionshipEditor | null>(null);

  // Новые инвайт-права
  const [canSettings, setCanSettings] = useState(false);
  const [canTeams, setCanTeams] = useState(true);
  const [canScoring, setCanScoring] = useState(true);
  const [canStages, setCanStages] = useState(true);

  // Свежесозданная ссылка инвайта
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Удаление/отзыв подтверждения
  const [confirmDeleteEditor, setConfirmDeleteEditor] = useState<ChampionshipEditor | null>(null);
  const [confirmRevokeInvite, setConfirmRevokeInvite] = useState<ChampionshipInvite | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchInvites = useCallback(async () => {
    try {
      setLoadingInvites(true);
      const { data, error } = await supabase
        .from('championship_invites')
        .select('*')
        .eq('championship_id', championshipId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(
        (data ?? []).map((row: any) => ({
          id: row.id,
          championshipId: row.championship_id,
          canManageSettings: row.can_manage_settings,
          canManageTeams: row.can_manage_teams,
          canManageScoring: row.can_manage_scoring,
          canManageStages: row.can_manage_stages,
          createdAt: new Date(row.created_at).getTime(),
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInvites(false);
    }
  }, [championshipId]);

  useEffect(() => {
    void fetchInvites();
  }, [fetchInvites]);

  // Создание инвайта
  async function handleCreateInvite() {
    setBusy(true);
    try {
      const invite = await api.editors.createInvite(championshipId, {
        canManageSettings: canSettings,
        canManageTeams: canTeams,
        canManageScoring: canScoring,
        canManageStages: canStages,
      });
      const link = `${window.location.origin}/#/invite/${invite.id}`;
      setGeneratedLink(link);
      toast.success('Приглашение успешно создано!');
      void fetchInvites();
    } catch (e) {
      console.error(e);
      toast.error('Не удалось создать приглашение.');
    } finally {
      setBusy(false);
    }
  }

  // Копирование ссылки
  async function handleCopyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success('Ссылка скопирована!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось скопировать.');
    }
  }

  // Удаление редактора
  async function handleDeleteEditor() {
    if (!confirmDeleteEditor) return;
    setBusy(true);
    try {
      await api.editors.remove(championshipId, confirmDeleteEditor.userId);
      toast.success('Редактор удален.');
      setConfirmDeleteEditor(null);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось удалить редактора.');
    } finally {
      setBusy(false);
    }
  }

  // Отзыв инвайта
  async function handleRevokeInvite() {
    if (!confirmRevokeInvite) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('championship_invites')
        .delete()
        .eq('id', confirmRevokeInvite.id);

      if (error) throw error;
      toast.success('Приглашение отозвано.');
      setConfirmRevokeInvite(null);
      void fetchInvites();
    } catch (e) {
      console.error(e);
      toast.error('Не удалось отозвать приглашение.');
    } finally {
      setBusy(false);
    }
  }

  // Сохранение отредактированных прав редактора
  async function handleSavePermissions() {
    if (!selectedEditor) return;
    setBusy(true);
    try {
      await api.editors.updatePermissions(championshipId, selectedEditor.userId, {
        canManageSettings: canSettings,
        canManageTeams: canTeams,
        canManageScoring: canScoring,
        canManageStages: canStages,
      });
      toast.success('Права редактора обновлены.');
      setEditPermissionsModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось обновить права.');
    } finally {
      setBusy(false);
    }
  }

  function openEditPermissions(editor: ChampionshipEditor) {
    setSelectedEditor(editor);
    setCanSettings(editor.canManageSettings);
    setCanTeams(editor.canManageTeams);
    setCanScoring(editor.canManageScoring);
    setCanStages(editor.canManageStages);
    setEditPermissionsModalOpen(true);
  }

  function openCreateInviteModal() {
    setGeneratedLink(null);
    setCanSettings(false);
    setCanTeams(true);
    setCanScoring(true);
    setCanStages(true);
    setInviteModalOpen(true);
  }

  const loading = loadingEditors || loadingInvites;

  if (loading && (!editors || editors.length === 0)) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Шапка вкладки */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-section">Редакторы таблиц</h2>
          <p className="text-xs text-text-secondary mt-1 max-w-xl">
            Вы можете пригласить других участников помогать вам администрировать чемпионат. Для каждого редактора
            можно задать индивидуальные ограничения.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreateInviteModal}>
          Пригласить редактора
        </Button>
      </div>

      {/* Список текущих редакторов */}
      <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
        <div className="p-4 border-b border-ink-border font-bold uppercase tracking-badge text-xs flex items-center gap-2 bg-ink-elevated text-lime-primary">
          <Shield size={14} />
          Текущие редакторы ({editors?.length ?? 0})
        </div>

        {!editors || editors.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-secondary">
            У этого чемпионата пока нет со-редакторов. Нажмите «Пригласить редактора», чтобы добавить кого-то.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-ink-border text-text-secondary uppercase tracking-badge bg-ink-deep/50">
                  <th className="p-3 font-semibold">Пользователь</th>
                  <th className="p-3 font-semibold">Настройки</th>
                  <th className="p-3 font-semibold">Команды/Пилоты</th>
                  <th className="p-3 font-semibold">Система очков</th>
                  <th className="p-3 font-semibold">Этапы/Результаты</th>
                  <th className="p-3 font-semibold text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-border">
                {editors.map((editor) => (
                  <tr key={editor.id} className="hover:bg-ink-surface/30 transition">
                    <td className="p-3">
                      <div className="font-semibold text-text-primary">
                        {editor.userDisplayName || 'Без имени'}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">{editor.userEmail}</div>
                    </td>
                    <td className="p-3">
                      <PermissionBadge active={editor.canManageSettings} />
                    </td>
                    <td className="p-3">
                      <PermissionBadge active={editor.canManageTeams} />
                    </td>
                    <td className="p-3">
                      <PermissionBadge active={editor.canManageScoring} />
                    </td>
                    <td className="p-3">
                      <PermissionBadge active={editor.canManageStages} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => openEditPermissions(editor)}>
                          Права
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 size={12} />}
                          className="text-danger hover:bg-danger/10 hover:text-danger"
                          onClick={() => setConfirmDeleteEditor(editor)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Список активных инвайтов */}
      <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
        <div className="p-4 border-b border-ink-border font-bold uppercase tracking-badge text-xs flex items-center gap-2 bg-ink-elevated text-text-secondary">
          <Key size={14} />
          Активные приглашения ({invites.length})
        </div>

        {invites.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted">Нет активных ссылок-приглашений.</div>
        ) : (
          <div className="divide-y divide-ink-border text-xs">
            {invites.map((invite) => {
              const link = `${window.location.origin}/#/invite/${invite.id}`;
              return (
                <div key={invite.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ink-surface/10 transition">
                  <div className="space-y-1">
                    <div className="font-semibold text-text-secondary truncate max-w-sm sm:max-w-md bg-ink-deep px-2 py-1 rounded border border-ink-border text-[11px] tabular">
                      {link}
                    </div>
                    <div className="flex gap-2 text-[10px] text-text-muted flex-wrap">
                      <span>Настройки: {invite.canManageSettings ? '✓' : '✗'}</span>
                      <span>•</span>
                      <span>Команды: {invite.canManageTeams ? '✓' : '✗'}</span>
                      <span>•</span>
                      <span>Очки: {invite.canManageScoring ? '✓' : '✗'}</span>
                      <span>•</span>
                      <span>Этапы: {invite.canManageStages ? '✓' : '✗'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="secondary" icon={<Copy size={12} />} onClick={() => void handleCopyLink(link)}>
                      Копировать
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10 text-[11px]"
                      onClick={() => setConfirmRevokeInvite(invite)}
                    >
                      Отозвать
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модалка создания приглашения */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Пригласить редактора"
        size="md"
        footer={
          generatedLink ? (
            <Button onClick={() => setInviteModalOpen(false)}>Готово</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setInviteModalOpen(false)} disabled={busy}>
                Отмена
              </Button>
              <Button onClick={() => void handleCreateInvite()} loading={busy}>
                Создать ссылку
              </Button>
            </>
          )
        }
      >
        {generatedLink ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2 bg-success/10 border border-success/30 text-success rounded p-3 text-xs leading-relaxed">
              <Check size={16} className="shrink-0 mt-0.5" />
              <span>
                Ссылка-приглашение создана. Скопируйте её и отправьте будущему редактору. Ссылка является
                одноразовой.
              </span>
            </div>

            <div className="flex gap-1.5 items-stretch mt-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 min-w-0 bg-ink-deep border border-ink-border rounded px-3 py-2 text-xs font-semibold tabular focus:outline-none"
              />
              <Button
                variant={copiedLink ? 'secondary' : 'primary'}
                icon={copiedLink ? <Check size={14} /> : <Copy size={14} />}
                onClick={() => void handleCopyLink(generatedLink)}
              >
                {copiedLink ? 'Готово' : 'Копировать'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-xs text-text-secondary leading-relaxed">
              Выберите права доступа, которые получит приглашенный пользователь. Мы рекомендуем ограничивать права на
              настройки чемпионата, если со-редактору требуется только вносить результаты.
            </p>

            <div className="space-y-3 bg-ink-deep border border-ink-border rounded p-4">
              <CheckboxRow
                id="inv-settings"
                label="Изменение настроек чемпионата"
                description="Позволяет менять название, баннер, описание, сезон и статус чемпионата."
                checked={canSettings}
                onChange={setCanSettings}
              />
              <CheckboxRow
                id="inv-teams"
                label="Управление командами и пилотами"
                description="Позволяет добавлять/редактировать/удалять команды и пилотов, перетаскивать их."
                checked={canTeams}
                onChange={setCanTeams}
              />
              <CheckboxRow
                id="inv-scoring"
                label="Настройка систем начисления очков"
                description="Позволяет создавать, менять и удалять системы очков чемпионата."
                checked={canScoring}
                onChange={setCanScoring}
              />
              <CheckboxRow
                id="inv-stages"
                label="Проведение и откат этапов"
                description="Позволяет создавать этапы через мастер добавления этапа и удалять прошедшие этапы."
                checked={canStages}
                onChange={setCanStages}
              />
            </div>

            <div className="bg-ink-elevated border border-ink-border rounded p-3 flex gap-2 text-xs text-text-secondary leading-relaxed">
              <Info size={14} className="shrink-0 mt-0.5 text-lime-primary" />
              <span>Удалить чемпионат может только его создатель (редакторы этого сделать не смогут).</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Модалка изменения прав */}
      <Modal
        open={editPermissionsModalOpen}
        onClose={() => setEditPermissionsModalOpen(false)}
        title={`Права доступа: ${selectedEditor?.userDisplayName || 'Редактор'}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditPermissionsModalOpen(false)} disabled={busy}>
              Отмена
            </Button>
            <Button onClick={() => void handleSavePermissions()} loading={busy}>
              Сохранить
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-3 bg-ink-deep border border-ink-border rounded p-4">
            <CheckboxRow
              id="edit-settings"
              label="Изменение настроек чемпионата"
              checked={canSettings}
              onChange={setCanSettings}
            />
            <CheckboxRow
              id="edit-teams"
              label="Управление командами и пилотами"
              checked={canTeams}
              onChange={setCanTeams}
            />
            <CheckboxRow
              id="edit-scoring"
              label="Настройка систем начисления очков"
              checked={canScoring}
              onChange={setCanScoring}
            />
            <CheckboxRow
              id="edit-stages"
              label="Проведение и откат этапов"
              checked={canStages}
              onChange={setCanStages}
            />
          </div>
        </div>
      </Modal>

      {/* Подтверждения удаления */}
      <ConfirmDialog
        open={!!confirmDeleteEditor}
        title="Удалить со-редактора?"
        message={`Вы уверены, что хотите лишить пользователя ${confirmDeleteEditor?.userDisplayName || ''} прав редактора? Он больше не сможет управлять этим чемпионатом.`}
        destructive
        confirmLabel="Лишить прав"
        onConfirm={() => void handleDeleteEditor()}
        onCancel={() => setConfirmDeleteEditor(null)}
      />

      <ConfirmDialog
        open={!!confirmRevokeInvite}
        title="Отозвать приглашение?"
        message="Вы уверены, что хотите отозвать это приглашение? Ссылка станет недействительной."
        destructive
        confirmLabel="Отозвать"
        onConfirm={() => void handleRevokeInvite()}
        onCancel={() => setConfirmRevokeInvite(null)}
      />
    </div>
  );
}

/* ---------- Вспомогательные микро-компоненты ---------- */

function PermissionBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-badge shrink-0',
        active ? 'bg-lime-primary/15 text-lime-primary' : 'bg-ink-deep text-text-muted border border-ink-border',
      ].join(' ')}
    >
      {active ? 'Разрешено' : 'Запрещено'}
    </span>
  );
}

function CheckboxRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 accent-lime-primary rounded bg-ink-card border border-ink-border focus:ring-offset-0 focus:ring-0 shrink-0"
      />
      <div className="space-y-0.5 text-xs">
        <span className="font-semibold text-text-primary block">{label}</span>
        {description && <span className="text-[10px] text-text-secondary leading-relaxed block">{description}</span>}
      </div>
    </label>
  );
}
