import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Вызывается перед закрытием по Escape или клику на фон.
   * Верните false, чтобы отменить закрытие (например, показать подтверждение,
   * если в форме есть несохранённые данные). Кнопки в footer закрывают напрямую.
   */
  onBeforeClose?: () => boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

/*
  Стек открытых модалов (для вложенных: форма → кроппер → подтверждение).
  Escape и focus-trap обрабатывает только верхний модал стека,
  а body-скролл разблокируется когда закрыт последний.
*/
const modalStack: symbol[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  onBeforeClose,
  title,
  children,
  footer,
  size = 'md',
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Актуальный обработчик закрытия для слушателя в эффекте
  const requestCloseRef = useRef<() => void>(() => {});
  requestCloseRef.current = () => {
    if (onBeforeClose && !onBeforeClose()) return;
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const id = Symbol('modal');
    modalStack.push(id);
    const prevFocus = document.activeElement as HTMLElement | null;

    requestAnimationFrame(() => {
      // Фокус внутрь диалога, если он ещё не там (вложенный модал мог забрать его)
      if (modalStack[modalStack.length - 1] === id) panelRef.current?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      // Реагирует только верхний модал стека
      if (modalStack[modalStack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        requestCloseRef.current();
        return;
      }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        const inside = active instanceof Node && panel.contains(active);
        if (e.shiftKey) {
          if (!inside || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (!inside || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = modalStack.indexOf(id);
      if (i >= 0) modalStack.splice(i, 1);
      if (modalStack.length === 0) document.body.style.overflow = '';
      prevFocus?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop с blur — клик по нему (и только по нему) закрывает модал */}
          <motion.div
            initial={{ backdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(8px)' }}
            exit={{ backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 bg-black/60"
            onClick={() => requestCloseRef.current()}
            aria-hidden="true"
          />
          {/* Контент модала */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className={[
              'relative bg-ink-elevated border border-ink-border rounded w-full',
              'flex flex-col max-h-[90dvh] focus:outline-none',
              sizeClass[size],
            ].join(' ')}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-border shrink-0">
              <h2 className="text-base uppercase tracking-section font-bold">{title}</h2>
              <button
                onClick={() => requestCloseRef.current()}
                className="text-text-secondary hover:text-text-primary transition"
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-5 overflow-y-auto flex-1">{children}</div>
            {footer && (
              <div className="px-5 py-4 border-t border-ink-border flex justify-end gap-2 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
