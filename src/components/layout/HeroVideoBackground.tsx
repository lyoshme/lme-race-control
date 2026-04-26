import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Путь к видео-файлу (относительно `public/`, например `/hero.mp4`). */
  src: string;
  /** Опциональный постер-кадр пока видео грузится. */
  poster?: string;
  className?: string;
}

/**
 * Полупрозрачный видео-фон для hero-секции.
 *
 * - Уважает `prefers-reduced-motion`: для пользователей с этой системной
 *   настройкой автозапуск отключается, остаётся постер.
 * - Если видео не загрузилось (404 / неподдерживаемый кодек) — `onError`
 *   снимает элемент с разметки, и hero падает на градиентный фон родителя.
 * - Прозрачность управляется CSS-переменной `--hero-video-opacity`,
 *   которую можно задать разной для светлой/тёмной темы (см. index.css).
 */
export function HeroVideoBackground({ src, poster, className = '' }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduceMotion) {
      v.pause();
      return;
    }
    // Safari иногда блокирует autoplay даже при muted —
    // вызываем play() явно после mount.
    v.play().catch(() => {
      /* noop — оставим постер */
    });
  }, [src]);

  if (failed) return null;

  return (
    <video
      ref={ref}
      className={[
        'absolute inset-0 w-full h-full object-cover pointer-events-none select-none',
        className,
      ].join(' ')}
      style={{ opacity: 'var(--hero-video-opacity, 0.4)' }}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onError={() => setFailed(true)}
      aria-hidden="true"
    />
  );
}
