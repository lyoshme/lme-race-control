import { supabase } from '@/lib/supabase';

export type Bucket = 'banners' | 'logos' | 'photos';

/**
 * Загружает файл/Blob в указанный bucket по пути {auth.uid}/{filename}.
 * Возвращает публичный URL.
 *
 * Если передана data-URL строка (base64), она будет конвертирована в Blob автоматом.
 */
export async function uploadImage(
  bucket: Bucket,
  fileOrDataUrl: File | Blob | string,
  fileName?: string,
): Promise<string> {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) throw new Error('Не авторизован');

  let blob: Blob;
  let ext = 'png';
  if (typeof fileOrDataUrl === 'string') {
    const m = fileOrDataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!m) throw new Error('Некорректная data-URL');
    const mime = m[1];
    ext = mime.split('/')[1] ?? 'png';
    const bin = atob(m[2]);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    blob = new Blob([buf], { type: mime });
  } else if (fileOrDataUrl instanceof File) {
    blob = fileOrDataUrl;
    ext = fileOrDataUrl.name.split('.').pop() ?? 'png';
  } else {
    blob = fileOrDataUrl;
    ext = (blob.type.split('/')[1] ?? 'png').split(';')[0];
  }

  const safeName = fileName ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${userId}/${safeName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { cacheControl: '31536000', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Удаляет объект по публичному URL (не критично — если объект не нашёлся, проигнорируем).
 * Используется при замене баннера/лого/фото.
 */
export async function removeByUrl(bucket: Bucket, url: string): Promise<void> {
  const marker = `/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  const path = url.slice(i + marker.length);
  await supabase.storage.from(bucket).remove([path]);
}
