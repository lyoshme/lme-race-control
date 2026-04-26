import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  open: boolean;
  src: string;
  aspect: number; // width / height
  /** Максимальный итоговый размер по большей стороне (px) */
  maxDim?: number;
  /** Качество JPEG (0..1) */
  quality?: number;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

export function ImageCropper({
  open,
  src,
  aspect,
  maxDim = 1200,
  quality = 0.9,
  onCancel,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setAreaPx(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!areaPx) return;
    setBusy(true);
    try {
      const out = await renderCrop(src, areaPx, rotation, maxDim, quality);
      onConfirm(out);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Обрезать изображение"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Отмена
          </Button>
          <Button onClick={handleConfirm} loading={busy} disabled={!areaPx}>
            Применить
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div
          className="relative w-full bg-ink-deep rounded overflow-hidden"
          style={{ height: 'min(60vh, 480px)' }}
        >
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <ZoomOut size={16} className="text-text-secondary" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-lime-primary"
              aria-label="Масштаб"
            />
            <ZoomIn size={16} className="text-text-secondary" />
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCw size={14} />}
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            Поворот
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Рендерит обрезанное и повёрнутое изображение из исходника + области обрезки.
 * Возвращает data URL JPEG.
 */
async function renderCrop(
  src: string,
  area: Area,
  rotation: number,
  maxDim: number,
  quality: number,
): Promise<string> {
  const image = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;

  // Размеры исходного изображения после поворота
  const isSideways = rotation % 180 !== 0;
  const safeW = isSideways ? image.height : image.width;
  const safeH = isSideways ? image.width : image.height;

  // Промежуточный canvas для повёрнутого источника
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = safeW;
  sourceCanvas.height = safeH;
  const sctx = sourceCanvas.getContext('2d');
  if (!sctx) throw new Error('canvas ctx');
  sctx.translate(safeW / 2, safeH / 2);
  sctx.rotate(rad);
  sctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Обрезанная часть
  const cropCanvas = document.createElement('canvas');
  let outW = area.width;
  let outH = area.height;
  if (Math.max(outW, outH) > maxDim) {
    const ratio = outW / outH;
    if (outW >= outH) {
      outW = maxDim;
      outH = Math.round(maxDim / ratio);
    } else {
      outH = maxDim;
      outW = Math.round(maxDim * ratio);
    }
  }
  cropCanvas.width = outW;
  cropCanvas.height = outH;
  const cctx = cropCanvas.getContext('2d');
  if (!cctx) throw new Error('canvas ctx');
  cctx.drawImage(
    sourceCanvas,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outW,
    outH,
  );

  return cropCanvas.toDataURL('image/jpeg', quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}
