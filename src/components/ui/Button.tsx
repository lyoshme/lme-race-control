import { useCallback, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-lime-primary text-ink-deep hover:bg-lime-dark disabled:opacity-40 disabled:cursor-not-allowed font-bold',
  secondary:
    'glass-subtle text-text-primary hover:border-lime-primary hover:text-lime-primary disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-ink-elevated disabled:opacity-40 disabled:cursor-not-allowed',
  danger:
    'bg-transparent text-danger border border-ink-border hover:bg-danger hover:text-white hover:border-danger disabled:opacity-40 disabled:cursor-not-allowed',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs tracking-badge uppercase',
  md: 'px-4 py-2 text-sm tracking-badge uppercase',
  lg: 'px-6 py-3 text-sm tracking-badge uppercase',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  iconRight,
  full,
  className = '',
  children,
  disabled,
  onClick,
  ...rest
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const btn = ref.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        btn.style.setProperty('--ripple-x', `${x}%`);
        btn.style.setProperty('--ripple-y', `${y}%`);
      }
      onClick?.(e);
    },
    [onClick],
  );

  return (
    <button
      ref={ref}
      {...rest}
      disabled={disabled || loading}
      onClick={handleClick}
      className={[
        'btn-ripple inline-flex items-center justify-center gap-2 rounded transition select-none',
        variantClass[variant],
        sizeClass[size],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
      {iconRight}
    </button>
  );
}
