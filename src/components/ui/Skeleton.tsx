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
    />
  );
}
