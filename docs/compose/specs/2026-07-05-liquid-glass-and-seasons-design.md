# Liquid Glass UI + Season System Design

> **Два независимых подпроекта:** визуальные эффекты стекла и система сезонов внутри чемпионатов.

---

## [S1] Liquid Glass UI — Проблема

Текущий интерфейс использует сплошные тёмные/светлые фоны. Нет глубины, нет визуального层次感. iOS 26 Liquid Glass создаёт ощущение полупрозрачности и глубины через blur и отражения.

## [S2] Liquid Glass UI — Решение

Адаптация принципов iOS 26 Liquid Glass через CSS `backdrop-filter` + полупрозрачные фоны.

### Классы в `index.css`

```css
.glass {
  backdrop-filter: blur(12px);
  background: rgba(var(--ink-card) / 0.6);
  border: 1px solid rgba(var(--ink-border) / 0.5);
}

.glass-strong {
  backdrop-filter: blur(20px);
  background: rgba(var(--ink-deep) / 0.7);
  border-bottom: 1px solid rgba(var(--lime-primary) / 0.2);
}

.glass-subtle {
  backdrop-filter: blur(8px);
  background: rgba(var(--lime-primary) / 0.05);
  border: 1px solid rgba(var(--lime-primary) / 0.15);
}
```

### Элементы

| Элемент | Класс | Дополнительно |
|---------|-------|---------------|
| Header/Navbar | `glass-strong` | `position: sticky; top: 0` |
| Кнопки CTA | `glass-subtle` | Hover: `background: rgba(lime-primary / 0.15)` |
| Карточки чемпионатов | `glass` | Hover: `transform: translateY(-4px)` + glow |

### Темы

- Dark: blur ярче (opacity 0.7 для header, 0.6 для карточек)
- Light: blur тусклее (opacity 0.85 для header, 0.75 для карточек)

---

## [S3] Seasons — Проблема

Сейчас каждый чемпионат — один сезон. Чтобы начать новый, нужно создавать новый чемпионат с нуля. Это неудобно: нет истории, нет сравнения сезонов, данные размазаны по разным чемпионатам.

## [S4] Seasons — Решение

Система сезонов внутри одного чемпионата. Каждый сезон изолирован: свои команды, пилоты, этапы, зачёты.

### Модель данных

**Новая таблица `seasons`:**

```sql
CREATE TABLE seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Один активный сезон на чемпионат
CREATE UNIQUE INDEX idx_seasons_one_active
  ON seasons(championship_id)
  WHERE is_active = true;
```

**Изменения в существующих таблицах:**

| Таблица | Новое поле |
|---------|-----------|
| `teams` | `season_id uuid NOT NULL REFERENCES seasons(id)` |
| `drivers` | `season_id uuid NOT NULL REFERENCES seasons(id)` |
| `scoring_systems` | `season_id uuid NOT NULL REFERENCES seasons(id)` |
| `stages` | `season_id uuid NOT NULL REFERENCES seasons(id)` |
| `standings` | `season_id uuid NOT NULL REFERENCES seasons(id)` |

**Standings:** PK меняется на `(championship_id, season_id)` вместо только `championship_id`.

### Миграция существующих данных

1. Для каждого чемпионата создать сезон «Сезон 1» (`is_active = true`)
2. Заполнить `season_id` во всех связанных таблицах

### API-слой

Все CRUD-функции получают обязательный параметр `seasonId`:

```typescript
// Пример
api.teams.list(championshipId, seasonId)
api.drivers.list(championshipId, seasonId)
api.stages.list(championshipId, seasonId)
api.standings.get(championshipId, seasonId)
```

### Типы TypeScript

```typescript
interface Season {
  id: string;
  championshipId: string;
  name: string;
  isActive: boolean;
  createdAt: number;
}

// Обновлённые типы — добавлен seasonId:
interface Team { ...; seasonId: string; }
interface Driver { ...; seasonId: string; }
interface Stage { ...; seasonId: string; }
interface Standings { championshipId: string; seasonId: string; ... }
interface ScoringSystem { ...; seasonId: string; }
```

---

## [S5] Seasons — UI

### Dropdown-переключатель

- Расположен в шапке страницы чемпионата (справа от названия)
- Показывает все сезоны (active + archived)
- Текущий активный — по умолчанию
- При выборе — переключение всех данных на странице

### Управление сезонами (manage)

- Новая вкладка «Сезоны» в managed-режиме
- Кнопка «Новый сезон» → модалка с названием (авто-инкремент)
- При создании: новый сезон становится активным, предыдущий — архив

### Фильтрация данных

Все таблицы, карточки этапов, зачёты — фильтруются по выбранному сезону.

### RLS

Тот же принцип: чтение публичное, запись через `has_championship_permission`.

---

## [S6] Общие ограничения

- React 18, TypeScript, Vite, Tailwind CSS 3
- Supabase (PostgreSQL + RLS)
- Existent API pattern: snake_case ↔ camelCase через mappers.ts
- Hash-роутер без изменений
- Выбранный сезон хранится в React state (не в URL) — это transient UI state
