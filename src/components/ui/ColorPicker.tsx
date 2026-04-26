import { FieldShell } from './Input';

const PRESETS = [
  '#C6FF00',
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#00C7BE',
  '#0A84FF',
  '#5E5CE6',
  '#AF52DE',
  '#FF2D55',
  '#FFFFFF',
  '#888888',
];

interface Props {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  error?: string;
}

export function ColorPicker({ value, onChange, label, error }: Props) {
  return (
    <FieldShell label={label} error={error}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded border border-ink-border bg-ink-surface cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-ink-surface border border-ink-border rounded px-3 py-2 text-sm tabular focus:outline-none focus:border-lime-primary transition"
          placeholder="#C6FF00"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={[
              'w-6 h-6 rounded transition border-2',
              value.toLowerCase() === c.toLowerCase()
                ? 'border-lime-primary'
                : 'border-transparent hover:border-ink-border',
            ].join(' ')}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}
      </div>
    </FieldShell>
  );
}
