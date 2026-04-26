interface Props {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}

export function Avatar({ src, name = '', size = 32, className = '' }: Props) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className={[
        'rounded-full overflow-hidden bg-ink-surface border border-ink-border flex items-center justify-center shrink-0',
        className,
      ].join(' ')}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-text-secondary font-bold" style={{ fontSize: size * 0.4 }}>
          {initials || '—'}
        </span>
      )}
    </div>
  );
}
