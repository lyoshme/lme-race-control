# LMERC

Платформа спортивных онлайн-таблиц для автоспорта. Создавайте чемпионаты,
управляйте командами и пилотами, ведите таблицы и проводите этапы.

## Стек

- React 18 + TypeScript
- Vite
- Tailwind CSS (темизация через CSS-переменные: тёмная и светлая темы)
- Supabase (Postgres + Auth + Storage + Realtime)
- @dnd-kit/core + @dnd-kit/sortable (drag-and-drop)
- framer-motion (анимация перестановки строк в таблицах)
- react-easy-crop (обрезка изображений)
- flag-icons (CSS-флаги ISO 3166-1)
- lucide-react (иконки)
- Шрифт: TikTok Sans (Google Fonts, веса 300–900)

## Запуск

```bash
npm install
npm run dev
```

Откройте http://localhost:5173

## Сборка

```bash
npm run build
npm run preview
```

## Переменные окружения

Скопируй `.env.example` в `.env` и заполни:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Значения берутся из Supabase → Project Settings → API.

## Бэкенд (Supabase)

1. Создай проект в [Supabase](https://supabase.com)
2. Открой SQL Editor → New query и выполни `supabase/migrations/0001_init.sql`
3. Включи **Realtime** для таблиц: championships, teams, drivers, scoring_systems, standings, stages
4. Создай Storage buckets: `banners`, `logos`, `photos` (public)

### Первый админ

После первого входа через OTP выполни в SQL Editor:

```sql
update public.profiles set is_admin = true where email = 'твой@email';
```

## Реализованная функциональность

### Итерация 1
- Лендинг с сеткой чемпионатов и пустым состоянием
- Полупрозрачное hero-видео на главной (mp4 в `public/hero.mp4`)
- Создание чемпионата (баннер с обрезкой и авто-сжатием, описание, дисциплина, сезон)
- Публичная страница чемпионата (Обзор, Пилоты, Команды, Участники, Этапы)
- CRUD команд (логотип, цвет) и пилотов (фото с обрезкой, номер, страна)
- Система очков с пресетами (F1, Sprint, Custom) и бонусами
- Инициализация и сброс таблиц
- Toasts, валидация, скелетоны, confirm-диалоги
- Тёмная и светлая темы (toggle в шапке)
- Полный список стран ISO 3166-1 с CSS-флагами и комбобоксом-поиском

### Итерация 2
- Drag-and-drop пилотов между командами и в зону «Без команды»
- Мастер этапа в 4 шага: параметры → участники → DnD-расстановка по местам → подтверждение
  - Pole position и fastest lap (по одному пилоту на этап) с live-расчётом очков
  - Атомарная фиксация `teamId` в результатах этапа для корректного отката
- Карточки этапов с подиумом топ-3 (золото/серебро/бронза) и модалом полных результатов
- Применение этапа к standings: автоматический пересчёт очков, побед, подиумов; зеркальный откат при удалении этапа
- Анимация перестановки строк в таблицах пилотов и команд через `framer-motion` `layout`

### Итерация 3
- **Supabase backend**: Postgres с RLS, Auth, Storage, Realtime
- **Email OTP**: вход по коду без паролей, автосоздание профиля
- **Роли**: `is_admin` в `profiles`, админ-панель с очередью модерации
- **Модерация чемпионатов**: при создании статус `pending` → админ одобряет/отклоняет → `approved`/`rejected`
- **Публичная лента**: только одобренные чемпионаты на главной
- **API-слой**: типизированные CRUD-функции для всех сущностей в `src/lib/api/`
- **Реактивные запросы**: `useSupabaseQuery` с авто-подпиской на realtime-изменения
- **Загрузка изображений**: Supabase Storage (banners, logos, photos) с data URL
- **Личный кабинет**: список своих чемпионатов с бейджами статуса, редактирование display_name
- **Шаринг + OG**: кнопка «Поделиться», Vercel Edge Function `/share/:id` с OG meta-тегами
- **Полная очистка**: удалены `lib/data.ts` и `useStorage.ts` (теперь только Supabase)
