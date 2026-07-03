import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: Props) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-ink-border rounded',
        'bg-gradient-to-b from-ink-card/50 to-transparent',
        className,
      ].join(' ')}
    >
      {icon && <div className="text-text-muted mb-4 animate-bounce-soft">{icon}</div>}
      <h3 className="text-lg uppercase tracking-section font-bold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-md mb-5">{description}</p>
      )}
      {action}
    </div>
  );
}
