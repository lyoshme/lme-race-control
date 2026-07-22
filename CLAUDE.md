# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LMERC is a web platform for running motorsport (sim-racing / real racing) championships — creating
championships, managing teams and drivers, running stages/events, and tracking driver/team standings.
The UI and most in-repo docs (README.md, project.md) are written in Russian; match that language when
editing user-facing strings or docs unless told otherwise.

## Commands

```bash
npm install       # install dependencies
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # tsc -b (type-check) && vite build — this is the only type-check command
npm run preview   # serve the production build locally
```

There is no lint script, no test runner, and no test files in this repo. Treat `npm run build`
(or `npx tsc --noEmit` for a faster type-only check) as the correctness gate for changes.

Environment: copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
from Supabase → Project Settings → API. Without these, `isSupabaseConfigured` (`src/lib/supabase.ts`)
is `false` and the app renders a visible "Supabase not configured" banner instead of failing silently.

## Architecture

**Stack**: React 18 + TypeScript + Vite, Tailwind CSS 3, Supabase (Postgres + RLS, Auth, Storage,
Realtime), @dnd-kit (drag-and-drop), framer-motion (row reorder animations), react-easy-crop
(image cropping), deployed to Vercel (SPA + one Edge Function).

**Routing**: `src/router.tsx` is a hand-rolled hash router (`#/...`), not a library — `RouterProvider`
parses `window.location.hash` into a `Route` union and exposes `goX`/`setXTab` navigation functions via
context (`useRouter`). Routes: landing, account, admin, invite/:id, championship/:id/:tab (public tabs:
overview/drivers/teams/participants/stages), championship/:id/manage/:tab (manage tabs: settings/teams/
scoring/standings/stages/editors/seasons), championship/:id/driver/:driverId.

**Data flow — API layer (`src/lib/api/`)**: one module per entity (championships, seasons, teams,
drivers, scoring, standings, stages, editors, uploads), barrel-exported from `index.ts` and imported as
`import * as api from '@/lib/api'` (e.g. `api.teams.list(...)`). Every module talks to Supabase directly
and converts snake_case DB rows to camelCase domain types via `mappers.ts` (`rowToX` / `xToInsert` /
`xToUpdate` functions). Domain types live in `src/types.ts`; raw DB row types are generated/maintained by
hand in `src/lib/database.types.ts`. Never use snake_case fields outside `mappers.ts` and the raw
Supabase calls in `lib/api/*` — features/pages should only see camelCase domain objects.

**Reactive reads — `useSupabaseQuery`** (`src/hooks/useSupabaseQuery.ts`): the standard way pages/features
fetch data. Takes a stable `fetcher` (wrap in `useCallback`), an optional list of `{ table, filter }`
Realtime subscriptions (PostgREST filter syntax, e.g. `` `championship_id=eq.${id}` ``), and a deps array
that reruns the fetch. It auto-refetches on any INSERT/UPDATE/DELETE on the subscribed tables — this is
how the UI stays live across browser tabs/users without manual invalidation.

**Auth** (`src/hooks/useAuth.ts`): passwordless email OTP via Supabase Auth (`signInWithOtp` /
`verifyOtp`), no passwords anywhere. `AuthProvider` holds `session` + `profiles` row and exposes them
through `useAuth()`. Admin role is the `is_admin` boolean on `profiles`, set manually in SQL — there is no
in-app admin promotion flow.

**Seasons**: championships were retrofitted with a `seasons` table; teams/drivers/scoring_systems/stages/
standings all carry a `season_id` FK and every list/get call in `lib/api/*` takes `(championshipId,
seasonId)`. Exactly one season per championship can be `is_active` (enforced by a partial unique index).
When adding a new entity under a championship, it almost certainly needs a `season_id` too, and any page/
tab reading child data needs a `seasonId` prop threaded down from the season selector state (selected
season lives in React state, not in the URL).

**Authorization model**: Postgres RLS everywhere, no app-level permission checks duplicate the DB rules.
Access order is Admin → Owner → Editor, checked atomically via the `has_championship_permission(...)` SQL
function. Editors get four independent boolean grants (`can_manage_settings/teams/scoring/stages`),
mirrored in the `EditorPermissions` TS type and granted either directly or through one-time invite links
(`championship_invites` → `accept_championship_invite` RPC).

**Stage wizard & standings**: a stage (race/qualifying/sprint) is confirmed through a 4-step wizard
(params → participants → drag-and-drop finishing order → confirm) in `src/features/stages/wizard/`.
Points are computed by `src/lib/scoring.ts` / `src/lib/standingsCalc.ts`: `calcResultPoints` combines a
scoring-system points table with pole/fastest-lap bonuses, and `applyStageToStandings` /
`revertStageFromStandings` mutate a cloned `Standings` object (never the original) so a stage's effect can
be cleanly undone if it's edited or deleted. Each `StageResultRow` freezes the driver's `teamId` at
confirmation time specifically so team-standing rollback stays correct even if the driver later changes
teams.

**Championship moderation**: new championships start `status: 'pending'`; an admin approves (→
`approved`) or rejects (with `rejection_reason`). Only `approved` (and not `is_hidden`) championships
appear in the public landing feed; owners/admins can still reach hidden ones by direct link.

**Migrations** (`supabase/migrations/`): applied by hand via the Supabase SQL Editor, in filename order —
there is no migration runner. Numbering is not strictly sequential (`0001-0004`, then `0010`, `0020`,
`0021`); pick the next free number in the relevant range rather than renumbering existing files. When a
migration adds a table/column that a domain type will expose, update in this order: migration SQL →
`database.types.ts` (row type) → `types.ts` (domain type) → `mappers.ts` → the relevant `lib/api/*.ts`
module.

**Theming**: dark/light via `data-theme` attribute on `<html>` (`src/hooks/useTheme.ts`, persisted to
localStorage; default is dark). All colors are CSS custom properties defined per-theme in `src/index.css`
and exposed to Tailwind through `rgb(var(--token) / <alpha-value>)` in `tailwind.config.js`, which is why
`bg-lime-primary/50`-style alpha modifiers work. Add new colors as CSS variables (both themes) plus a
Tailwind color entry — never hardcode hex values in components.

**Edge Function** (`api/share/[id].ts`): a Vercel Edge Function used only for social-sharing OG tags at
`/share/:id` (rewritten from `vercel.json`); it fetches the championship server-side, escapes the values
into HTML meta tags, and redirects real users into the SPA hash route. It reads env vars without the
`VITE_` prefix as a fallback (`SUPABASE_URL`/`SUPABASE_ANON_KEY`) since Vite-prefixed vars aren't always
what serverless functions expect.

**Docs**: `project.md` is a (Russian-language, occasionally stale) deep-dive doc with an ER diagram and
route table — useful for orientation but verify specifics against the code, especially anything
seasons-related since that subsystem was added after most of `project.md` was written. `docs/compose/`
holds implementation plans/specs for past features (e.g. the seasons rollout) written as
step-by-step, checkbox-tracked task lists with explicit file targets — follow that same
plan-then-checkbox-execute shape if asked to write a similar implementation plan.
