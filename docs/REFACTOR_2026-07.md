# BreMan Refactor — July 2026

Analysis + implementation record for the five workstreams requested:

1. Share one Supabase project with **mwes-invoice** and **spa-scheduler**
2. Switch to a **light theme**
3. **Planning dates** — breed date, 14-day check, estrumate shots, expected due date
4. **Mare/foal family** connections
5. Better **images + registration papers** integration

---

## Current state (before this refactor)

- Next.js 16 App Router + Supabase, ~5 commits in: schema, RLS, auth, horses list + CRUD forms.
- Migrations were written for a **dedicated** Supabase project, everything in the
  `public` schema. Nothing has been deployed yet, so we can restructure the schema
  freely — no data migration needed.
- The horses slide-out linked to `/app/horses/[id]` and `/app/horses/[id]/edit`,
  but neither route existed (404). Dashboard linked to `/app/breeding` and
  `/app/foaling` — also missing.
- **Build was broken**: `package-lock.json` pins Tailwind **4.3.0** but the project
  had a v3-style setup (`tailwind.config.ts`, `@tailwind base` directives, plain
  `tailwindcss` postcss plugin). Tailwind 4 requires `@tailwindcss/postcss` and
  CSS-first config. Fixed as part of the theme work.

## 1. Shared Supabase project

**Decision: dedicated `breman` Postgres schema inside the shared project.**

Why a schema instead of table prefixes or keeping `public`:

- mwes-invoice and spa-scheduler already own tables in `public`. A schema gives
  BreMan a clean namespace with zero collision risk (tables, enum types, functions,
  triggers all live in `breman.*`), and `supabase gen types` can target it directly.
- Supabase Auth (`auth.users`) is shared project-wide, which is what we want —
  one login for Jack/Natalie across the app family. BreMan keeps its own
  `breman.user_profiles` for BreMan roles (owner/staff/vet), so a user existing
  for mwes-invoice doesn't automatically get BreMan access: no `breman.user_profiles`
  row → RLS denies everything.
- PostgREST only exposes schemas you list. One dashboard setting
  (API → Exposed schemas → add `breman`) and the JS client's
  `db: { schema: 'breman' }` option does the rest.

What changed:

- Old migrations moved to `supabase/migrations/archive/` (never applied anywhere).
- New consolidated migration `20260706000000_breman_schema.sql`: creates the schema,
  all enums/tables/indexes/triggers **and** full RLS in one pass. Also switches
  `uuid_generate_v4()` → `gen_random_uuid()` (built-in, no extension needed) and
  moves the role-helper functions out of the `auth` schema (hosted Supabase now
  disallows user objects there) into `breman`.
- `lib/supabase/client.ts` / `server.ts` pass `db: { schema: 'breman' }`.
- Storage: bucket names are project-global, so BreMan uses a `breman-media` bucket
  (documented in `docs/SUPABASE_SETUP.md`).
- `.env.local.example` notes the URL/keys are the shared project's (same values
  as mwes-invoice / spa-scheduler).

**Setup steps required in the shared project's dashboard** (one-time, manual):
1. SQL Editor → run `supabase/migrations/20260706000000_breman_schema.sql`
2. Project Settings → API → **Exposed schemas** → add `breman`
3. Storage → create bucket `breman-media` (private)
4. Point `.env.local` at the shared project's URL + anon key

## 2. Light theme

- Migrated to Tailwind v4 CSS-first config: deleted `tailwind.config.ts`, replaced
  `postcss.config.mjs` plugin with `@tailwindcss/postcss`, and defined the palette
  as `@theme` tokens in `app/globals.css`.
- Palette: white page background, soft gray panels (`#f8f9fa`), gray-200 borders,
  near-black primary text, same blue accent (`#2563eb`) — reads as a sibling of the
  dark theme rather than a different product.
- Status badges and error blocks moved from `*-500/10 + text-*-500` (tuned for dark)
  to `bg-*-100 + text-*-700` variants for contrast on light backgrounds.

## 3. Planning dates

The mare's reproductive calendar is deterministic off two anchor dates, so
planned dates are **computed, not stored** (same philosophy as the computed mare
status in the plan §18 — no drift, no sync bugs):

From **breeding date**:
| Milestone | Offset |
|---|---|
| Post-breeding ovulation check | +1–2 days |
| **14-day pregnancy check** (twins window) | +14 |
| 30-day heartbeat check | +30 |
| 45-day check | +45 |
| 60-day check | +60 |
| Foaling watch opens | +320 |
| **Expected due date** | +340 |

From an **estrumate (cloprostenol) shot** — short-cycling an open mare:
| Milestone | Offset |
|---|---|
| Expect heat | +3–5 days |
| Expect breeding-ready | +6–8 days |

Implementation:

- `lib/utils/breeding.ts` — pure date math (`getBreedingSchedule`,
  `getEstrumateProjection`), plus per-event status derivation (which check is
  next / overdue, based on recorded `ultrasound_checks`).
- New table `breman.hormone_treatments` — estrumate, regumate, deslorelin, hCG,
  oxytocin, lutalyse, other; date, dose, administered_by, notes. Estrumate shots
  are real events (they drive the plan), so they're stored; everything derived
  from them is computed.
- New **Breeding page** (`/app/breeding`) — season view: every breeding event for
  the selected year with breed date, next check due (color-coded overdue/due-soon),
  latest result, and expected due date; recent estrumate shots with projected
  heat/breed windows; forms to record breedings, pregnancy checks, and shots.
- The horse detail page's Breeding tab shows the same computed schedule per mare.

## 4. Mare/foal family

The schema already had the right bones (`sire_id`/`dam_id` self-references on
`horses`); what was missing was UI:

- **Horse detail page** (`/app/horses/[id]`) — tabbed: Overview, **Family**,
  Breeding, Documents & Photos.
- Family tab: dam and sire as clickable cards (navigates to their detail pages),
  plus an offspring grid queried by `dam_id`/`sire_id` with sex, foal year, and
  click-through — so mare → foal → that foal's own page (and eventually her own
  produce record) is one tap each. Foals born here also show their originating
  foaling event.
- `/app/horses/[id]/edit` route added (reuses `HorseForm`), fixing the dead links
  from the list slide-out.

## 5. Images + registration papers

- `horses.profile_photo_url` — a face for every horse: shown on the detail page
  header, the family cards, and the offspring grid. Upload goes to the
  `breman-media` storage bucket via the browser client (falls back to pasting a URL).
- Registration papers ride the existing `documents` table (`doc_type: 'registration'`)
  instead of a new column — one system for all papers. The detail page's Documents
  tab lists documents by type with add/delete, and the Overview tab surfaces the
  registration paper link right next to the AQHA number.
- `attachments` table unchanged — still the future home for in-the-moment clinical
  photos once event detail views land.

## Deferred (unchanged from plan)

Dictation, notifications/alerts engine, contract parsing, costs UI, foaling watch
mode, Drive API listing. The dashboard now shows real upcoming-date data, but the
full alerts table/edge-function pipeline is still post-MVP.
