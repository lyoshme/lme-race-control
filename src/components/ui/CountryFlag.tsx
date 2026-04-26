import { nameOf } from '@/lib/countries';

interface Props {
  code: string; // ISO 3166-1 alpha-2 (любой регистр)
  /** Высота флага в px (ширина авто). По умолчанию 16. */
  size?: number;
  /** Делать круглым (для аватаров пилотов). */
  squared?: boolean;
  className?: string;
}

/**
 * Рендерит CSS-флаг из пакета `flag-icons` через классы `fi fi-XX`.
 * Все коды должны быть в нижнем регистре.
 *
 * Особый случай — XK (Косово) включён в flag-icons.
 */
export function CountryFlag({ code, size = 16, squared, className = '' }: Props) {
  if (!code) return null;
  const lower = code.toLowerCase();
  const title = nameOf(code.toUpperCase());
  // flag-icons по умолчанию даёт соотношение 4:3 (или 1:1 для squared)
  const width = squared ? size : Math.round(size * (4 / 3));
  return (
    <span
      className={[
        'fi',
        `fi-${lower}`,
        squared ? 'fis' : '',
        'inline-block shrink-0 rounded-[1px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width,
        height: size,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      aria-label={title}
      title={title}
      role="img"
    />
  );
}
