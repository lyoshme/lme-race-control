import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

/* Единственный источник длительности: и JS-таймер, и CSS-прогресс. */
const TOAST_MS = 4000;

interface TimerState {
  timeout: ReturnType<typeof setTimeout> | null; // null — на паузе (hover)
  deadline: number;
  remaining: number;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, TimerState>());

  const remove = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t?.timeout) clearTimeout(t.timeout);
    timers.current.delete(id);
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, kind, message }]);
      const timeout = setTimeout(() => remove(id), TOAST_MS);
      timers.current.set(id, { timeout, deadline: Date.now() + TOAST_MS, remaining: 0 });
    },
    [remove],
  );

  // Наведение ставит автозакрытие на паузу — сообщение можно дочитать
  const pause = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (!t?.timeout) return;
    clearTimeout(t.timeout);
    timers.current.set(id, {
      timeout: null,
      deadline: 0,
      remaining: Math.max(t.deadline - Date.now(), 600),
    });
  }, []);

  const resume = useCallback(
    (id: number) => {
      const t = timers.current.get(id);
      if (!t || t.timeout !== null) return;
      const timeout = setTimeout(() => remove(id), t.remaining);
      timers.current.set(id, { timeout, deadline: Date.now() + t.remaining, remaining: 0 });
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
        <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: '110%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '110%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t.id)}
            className="group flex flex-col bg-ink-elevated border border-ink-border rounded overflow-hidden shadow-lg"
          >
            <div
              className="flex items-start gap-3 px-4 py-3"
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
            {/* Progress bar (на hover пауза — синхронно с таймером) */}
            <div className="h-0.5 w-full bg-ink-border">
              <div
                className="h-full toast-progress group-hover:[animation-play-state:paused]"
                style={{
                  animationDuration: `${TOAST_MS}ms`,
                  backgroundColor:
                    t.kind === 'success'
                      ? 'rgb(var(--success))'
                      : t.kind === 'error'
                      ? 'rgb(var(--danger))'
                      : 'rgb(var(--lime-primary))',
                }}
              />
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used within ToastProvider');
  return v;
}
