interface Props {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export function Skeleton({ className = '', width, height, rounded }: Props) {
  return (
    <div
      className={['skeleton', rounded ? 'rounded-full' : 'rounded', className].join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** Карточка-скелетон: имитирует баннер + строки текста */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={['bg-ink-card border border-ink-border rounded overflow-hidden', className].join(' ')}>
      <div className="aspect-video skeleton" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-5 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-3 skeleton rounded w-full mt-1" />
        <div className="h-3 skeleton rounded w-2/3" />
      </div>
    </div>
  );
}
