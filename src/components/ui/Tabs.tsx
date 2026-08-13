import { motion } from 'framer-motion';

interface Tab<K extends string> {
  key: K;
  label: string;
  badge?: string;
}

interface Props<K extends string> {
  tabs: ReadonlyArray<Tab<K>>;
  active: K;
  onChange: (k: K) => void;
  className?: string;
}

export function Tabs<K extends string>({ tabs, active, onChange, className = '' }: Props<K>) {
  return (
    <div className={['flex border-b border-ink-border overflow-x-auto', className].join(' ')}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={[
              'relative px-4 py-3 text-xs uppercase tracking-badge transition shrink-0 flex items-center gap-2',
              isActive
                ? 'text-lime-primary font-bold'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {t.label}
            {t.badge && (
              <span className="text-3xs bg-ink-elevated px-1.5 py-0.5 rounded text-text-secondary">
                {t.badge}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
