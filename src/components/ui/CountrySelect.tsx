import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';
import { COUNTRIES, COUNTRY_BY_CODE } from '@/lib/countries';
import { CountryFlag } from './CountryFlag';
import { FieldShell } from './Input';

interface Props {
  value: string; // ISO alpha-2 code (uppercase)
  onChange: (code: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  /** Можно сбросить значение (выбрать «не указано») */
  clearable?: boolean;
}

export function CountrySelect({
  value,
  onChange,
  label,
  required,
  error,
  placeholder = 'Выберите страну',
  clearable,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const selected = COUNTRY_BY_CODE[value];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      // Фокус на инпуте
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Скролл к активному элементу
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  function pick(code: string) {
    onChange(code);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = filtered[activeIdx];
      if (c) pick(c.code);
    }
  }

  return (
    <FieldShell label={label} required={required} error={error}>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={[
            'w-full bg-ink-surface border rounded px-3 py-2 text-sm text-left flex items-center gap-2 transition focus:outline-none',
            error ? 'border-danger' : 'border-ink-border focus:border-lime-primary',
            open ? 'border-lime-primary' : '',
          ].join(' ')}
        >
          {selected ? (
            <>
              <CountryFlag code={selected.code} size={14} />
              <span className="flex-1 truncate">{selected.name}</span>
            </>
          ) : (
            <span className="flex-1 text-text-muted">{placeholder}</span>
          )}
          {clearable && selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-text-muted hover:text-danger transition p-0.5"
              aria-label="Очистить"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={[
              'text-text-secondary transition',
              open ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 45 }}
            style={{ transformOrigin: 'top' }}
            className="absolute z-40 left-0 right-0 mt-1 bg-ink-elevated border border-ink-border rounded shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-border">
              <Search size={14} className="text-text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIdx(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Поиск страны…"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-text-muted"
              />
            </div>
            <div
              ref={listRef}
              className="max-h-64 overflow-y-auto"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-text-muted text-center">
                  Ничего не найдено
                </div>
              ) : (
                filtered.map((c, idx) => {
                  const isActive = idx === activeIdx;
                  const isSelected = c.code === value;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => pick(c.code)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={[
                        'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition',
                        isActive ? 'bg-ink-surface' : '',
                        isSelected ? 'text-lime-primary' : '',
                      ].join(' ')}
                    >
                      <CountryFlag code={c.code} size={14} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-3xs text-text-muted tabular uppercase">
                        {c.code}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </FieldShell>
  );
}
