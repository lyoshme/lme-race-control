import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const api = useMemo<ToastCtx>(
    () => ({
      show,
      success: (m) => show('success', m),
      error: (m) => show('error', m),
      info: (m) => show('info', m),
    }),
    [show],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-slide-up flex items-start gap-3 bg-ink-elevated border border-ink-border rounded px-4 py-3 shadow-lg"
            style={{
              borderLeftWidth: 3,
              borderLeftColor:
                t.kind === 'success'
                  ? 'rgb(var(--success))'
                  : t.kind === 'error'
                  ? 'rgb(var(--danger))'
                  : 'rgb(var(--lime-primary))',
            }}
          >
            {t.kind === 'success' && (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: 'rgb(var(--success))' }} />
            )}
            {t.kind === 'error' && (
              <AlertCircle size={18} className="mt-0.5 shrink-0" style={{ color: 'rgb(var(--danger))' }} />
            )}
            {t.kind === 'info' && (
              <Info size={18} className="mt-0.5 shrink-0" style={{ color: 'rgb(var(--lime-primary))' }} />
            )}
            <div className="text-sm flex-1">{t.message}</div>
            <button
              onClick={() => remove(t.id)}
              className="text-text-secondary hover:text-text-primary transition"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used within ToastProvider');
  return v;
}
