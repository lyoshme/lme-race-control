import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

const baseField =
  'w-full bg-ink-surface border border-ink-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-lime-primary transition disabled:opacity-50';

export function FieldShell({
  label,
  error,
  hint,
  required,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs uppercase tracking-badge text-text-secondary">
          {label}
          {required && <span className="text-lime-primary ml-1">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  ({ label, error, hint, required, className = '', ...rest }, ref) => (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      <input
        ref={ref}
        {...rest}
        className={[baseField, error ? 'border-danger' : '', className].join(' ')}
      />
    </FieldShell>
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(({ label, error, hint, required, className = '', rows = 4, ...rest }, ref) => (
  <FieldShell label={label} error={error} hint={hint} required={required}>
    <textarea
      ref={ref}
      rows={rows}
      {...rest}
      className={[baseField, 'resize-y', error ? 'border-danger' : '', className].join(' ')}
    />
  </FieldShell>
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(({ label, error, hint, required, className = '', children, ...rest }, ref) => (
  <FieldShell label={label} error={error} hint={hint} required={required}>
    <select
      ref={ref}
      {...rest}
      className={[
        baseField,
        'appearance-none pr-9 cursor-pointer',
        error ? 'border-danger' : '',
        className,
      ].join(' ')}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12'><path d='M2 4l4 4 4-4' stroke='%23888' fill='none' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      {children}
    </select>
  </FieldShell>
));
Select.displayName = 'Select';
