import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы. ' +
      'Скопируй .env.example в .env.local и пропиши значения из Supabase → Project Settings → API.',
  );
}

/*
  Заглушки валидной формы вместо пустых строк: createClient('') бросает
  исключение на загрузке модуля и роняет всё приложение в белый экран.
  С заглушками приложение поднимается и показывает баннер
  «Supabase не настроен» (isSupabaseConfigured → ConfigWarning).
*/
export const supabase = createClient<Database>(
  url ?? 'https://placeholder.supabase.co',
  anon ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'lmerc-auth',
    },
  },
);

export const isSupabaseConfigured = !!url && !!anon;
