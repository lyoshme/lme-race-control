import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Upload, X, Crop as CropIcon } from 'lucide-react';
import { compressDataUrl } from '@/lib/image';
import { useToast } from '@/components/toast/ToastContext';
import { ImageCropper } from './ImageCropper';

interface Props {
  value: string; // base64 data URL or ''
  onChange: (next: string) => void;
  label?: string;
  hint?: string;
  aspect?: '16/9' | '21/9' | '1/1';
  maxKB?: number;
  maxDim?: number;
  className?: string;
  disabled?: boolean;
}

const aspectClass = {
  '16/9': 'aspect-video',
  '21/9': 'aspect-[21/9]',
  '1/1': 'aspect-square',
};

const aspectRatio: Record<NonNullable<Props['aspect']>, number> = {
  '16/9': 16 / 9,
  '21/9': 21 / 9,
  '1/1': 1,
};

export function FileDropzone({
  value,
  onChange,
  label,
  hint,
  aspect = '16/9',
  maxKB = 500,
  maxDim = 1600,
  className = '',
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const toast = useToast();

  async function handleFile(file: File) {
    if (disabled) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Поддерживаются только изображения');
      return;
    }
    try {
      const dataUrl = await readAsDataURL(file);
      // SVG не обрезаем — сохраняем как есть
      if (file.type === 'image/svg+xml') {
        onChange(dataUrl);
        return;
      }
      setCropSrc(dataUrl);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось прочитать файл');
    }
  }

  async function handleCropConfirm(cropped: string) {
    if (disabled) return;
    setBusy(true);
    try {
      const compressed = await compressDataUrl(cropped, { maxKB, maxDim });
      onChange(compressed);
      setCropSrc(null);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось сохранить изображение');
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) return;
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      {label && (
        <span className="text-xs uppercase tracking-badge text-text-secondary">{label}</span>
      )}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={[
          'relative rounded border flex items-center justify-center overflow-hidden transition',
          aspectClass[aspect],
          disabled
            ? 'border-ink-border bg-ink-deep/20 cursor-not-allowed opacity-60'
            : 'cursor-pointer border-dashed border-ink-border hover:border-lime-primary',
          drag ? 'border-lime-primary bg-lime-primary/10' : '',
          value && !disabled ? 'border-solid' : '',
        ].join(' ')}
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            {!disabled && (
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCropSrc(value);
                  }}
                  className="p-1.5 rounded bg-black/70 hover:bg-lime-primary hover:text-ink-deep text-white transition"
                  aria-label="Обрезать"
                  title="Обрезать"
                >
                  <CropIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  className="p-1.5 rounded bg-black/70 hover:bg-danger text-white transition"
                  aria-label="Удалить"
                  title="Удалить"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-secondary">
            {busy ? (
              <span className="inline-block w-6 h-6 border-2 border-lime-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={28} />
            )}
            <span className="text-xs uppercase tracking-badge">
              {busy ? 'Обработка…' : disabled ? 'Изображение отсутствует' : 'Перетащите или нажмите'}
            </span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
      {cropSrc && (
        <ImageCropper
          open
          src={cropSrc}
          aspect={aspectRatio[aspect]}
          maxDim={maxDim}
          onCancel={() => setCropSrc(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
