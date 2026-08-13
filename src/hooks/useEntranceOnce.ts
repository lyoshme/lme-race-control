import { useEffect, useState } from 'react';

/*
  Хеш-роутер размонтирует страницы при каждом переходе — без этой защиты
  вступительная stagger-хореография проигрывалась бы при каждом возвращении
  на страницу, задерживая доступ к контенту.

  Возвращает true только при первом показе страницы (по ключу) за сессию:
  `initial={entrance ? 'hidden' : false}` — при повторных визитах контент
  появляется сразу в конечном состоянии.
*/
const played = new Set<string>();

export function useEntranceOnce(key: string): boolean {
  const [first] = useState(() => !played.has(key));
  useEffect(() => {
    played.add(key);
  }, [key]);
  return first;
}
