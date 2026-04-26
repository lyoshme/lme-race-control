/**
 * Чтение и сжатие изображения в base64.
 * Гарантирует, что итоговый base64 не превышает примерно maxKB
 * (с допустимым отклонением).
 */
export interface CompressOptions {
  maxKB: number;
  maxDim: number; // максимальная сторона
}

export async function fileToCompressedBase64(
  file: File,
  opts: CompressOptions,
): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  // SVG не сжимаем
  if (file.type === 'image/svg+xml') return dataUrl;
  return compressDataUrl(dataUrl, opts);
}

export async function compressDataUrl(
  dataUrl: string,
  opts: CompressOptions,
): Promise<string> {
  const img = await loadImage(dataUrl);
  let { width, height } = img;
  const ratio = width / height;

  if (Math.max(width, height) > opts.maxDim) {
    if (width >= height) {
      width = opts.maxDim;
      height = Math.round(opts.maxDim / ratio);
    } else {
      height = opts.maxDim;
      width = Math.round(opts.maxDim * ratio);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.92;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (sizeKB(out) > opts.maxKB && quality > 0.4) {
    quality -= 0.1;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  // Если всё ещё крупно — уменьшим размер
  let dim = Math.max(width, height);
  while (sizeKB(out) > opts.maxKB && dim > 200) {
    dim = Math.round(dim * 0.85);
    if (width >= height) {
      width = dim;
      height = Math.round(dim / ratio);
    } else {
      height = dim;
      width = Math.round(dim * ratio);
    }
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    out = canvas.toDataURL('image/jpeg', 0.85);
  }
  return out;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function sizeKB(dataUrl: string): number {
  // base64 ~ 4/3 от размера
  const idx = dataUrl.indexOf(',');
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  return Math.round((b64.length * 3) / 4 / 1024);
}
