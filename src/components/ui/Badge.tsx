import type { ReactNode } from 'react';

type Variant = 'lime' | 'muted' | 'success' | 'danger' | 'outline';

interface Props {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  lime: 'bg-lime-primary text-ink-deep',
  muted: 'bg-ink-surface text-text-secondary border border-ink-border',
  success: 'bg-success/15 text-success border border-success/30',
  danger: 'bg-danger/15 text-danger border border-danger/30',
  outline: 'border border-lime-primary text-lime-primary',
};

export function Badge({ variant = 'lime', children, className = '' }: Props) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] uppercase tracking-badge font-bold leading-none',
        variantClass[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
