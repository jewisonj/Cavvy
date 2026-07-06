# BreMan — Equine Breeding Management System

> **Note (July 2026):** The project has been renamed **Cavvy** (a working ranch's horse herd) and repositioned as a full farm/stable manager. This document is the original BreMan planning spec, kept for historical reference — schema and feature intent still apply, but the app name, `cavvy` Postgres schema, and shared Supabase project supersede the naming and infrastructure notes below.

**Project name:** BreMan (Breeding Manager)
**Owner:** Jack
**Scale:** ~15 AQHA broodmares + offspring, generational tracking
**Stack direction:** Supabase (Postgres) + Next.js on Fly.io, Google ecosystem integration, AI-driven data entry
**AI model:** Claude Sonnet (latest) via Anthropic API
**Status:** Planning / pre-build

---

## 🚦 READ THIS FIRST (instructions for Claude Code)

Before writing any code for BreMan, do the following in order:

1. **Read this entire document.** It is the full spec. The most important sections for getting started are §10 (Handoff Notes), §2 (Data Model), and §8 (Build Phases).
2. **Reference the existing PDM-web project, specifically the MRP pages**, for the visual theme and interaction model. BreMan should feel like a sibling project to PDM-web. Pull the actual color tokens, spacing, typography, table styling, and slide-out panel component patterns directly from that codebase — do not reinvent them. The intended look: dark theme default, table-forward list views, slide-out panels for detail and quick-entry. See §4 for the full design direction.
3. **Reference the `pdm-system` skill** if available — it documents Jack's conventions, infrastructure, and preferences (PowerShell tooling, Tailscale remote access, DATASERVER, clean production-ready code, pragmatic over over-engineered).
4. **Confirm the schema (§2) before migrating.** Migrate the full schema in one pass, including post-MVP tables, to avoid a second migration later.
5. **Build MVP scope only** (defined in §8). Do not build deferred features (notifications, contract parsing, foaling watch, costs UI, etc.) until MVP is working.

If the PDM-web codebase is not accessible in the Claude Code session, ask Jack to point to it before doing the UI design pass.

### How Jack wants Claude to work

- **Say "I don't know" when you don't know.** A wrong guess dressed up as confidence costs more time than an honest "I'm not sure — here's how we could find out."
- **Ask questions instead of guessing.** If a requirement is ambiguous, ask. Don't fill the gap with an assumption just to keep moving.
- **Don't be sycophantic.** Skip the flattery and the "great question!" padding. Get to the substance.
- **Disagree openly.** If you think an approach is wrong, say so and explain why. Jack would rather hear a real objection than a polite yes. He values pragmatic solutions over over-engineered ones — push back if the plan drifts toward complexity for its own sake.
- **Be concise and direct.** No verbose tangents. Clean, production-ready code over clever code.

### Cross-project references for Claude Code

Beyond PDM-web for UI, reference Jack's other projects for established patterns:
- **VetBox-Pro** — for Claude Code agent / sub-agent setup, project structure, and general Claude Code configuration conventions. Also a Supabase + Fly.io project, so deployment and DB patterns should be consistent with it.
- **PDM-web** — for agent / sub-agent setup as well as the UI theme. Match how Claude Code agents, commands, and sub-agents were organized there.

The goal: BreMan's Claude Code setup (agents, sub-agents, CLAUDE.md conventions, directory structure) should be consistent with how VetBox-Pro and PDM-web are already configured, so Jack works in a familiar environment across all three.

---

## 1. Goals & Non-Goals

### Goals
- Track all horses (mares, foals, eventually stallions kept on property) as first-class entities
- Multi-year breeding history per mare (cycles, covers, pulls, ultrasounds, results)
- Foaling records linked to dam and sire
- Generational lineage — a foal today may be a broodmare in 4 years; same record, role evolves
- Per-horse "page" with tabbed views: Overview, Breeding History, Offspring, Health, Documents, Photos
- AI-assisted data entry (dictate from the barn → structured record)
- Google Drive integration for contracts, registration papers, coggins, vet docs
- Google Photos integration via shared album links per horse
- Solid year-over-year reporting (conception rates, foaling dates, problem cycles)

### Non-Goals (for v1)
- NOT a full veterinary EMR — VetBox-Pro territory, intentionally separate
- NOT a registry sync tool (no AQHA API integration yet)
- NOT public-facing — internal tool, single operator + maybe vet/breeding manager later
- NOT a mobile-native app — responsive web is fine; phone-first design but PWA at most

---

## 2. Core Entities (Data Model Draft)

### `horses`
The central table. Every animal — mare, foal, stallion — is a horse.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| registered_name | text | AQHA registered name, nullable until registration filed |
| barn_name | text | What you actually call her. Nullable, but if null UI displays a placeholder: "{dam_barn_name}'s {sex_label}" e.g. "Chiclet's baby filly" |
| aqha_number | text | nullable |
| sex | enum | mare, stallion, gelding, filly, colt |
| dob | date | nullable for older horses w/ unknown DOB |
| aqha_age_year | int | computed/stored — birth year for AQHA age purposes (Jan 1 rollover, see §11) |
| color | text | |
| markings | text | |
| sire_id | uuid | FK → horses.id, nullable |
| dam_id | uuid | FK → horses.id, nullable |
| owned | bool | true if currently owned, false for outside sires or sold horses still referenced |
| acquired_date | date | nullable |
| disposition_date | date | sold/deceased/etc |
| disposition_notes | text | |
| drive_folder_url | text | per-horse Google Drive folder |
| photos_album_url | text | shared Google Photos album |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Why one table for all horses:** A foal record created in 2025 becomes the same record we add breeding events to in 2029. No data migration, no role flag drama. The `sex` field can update (filly → mare at maturity is just semantics; functionally same record).

### `heat_observations`
Reproductive tracking — heat cycle monitoring. Single table, varying detail. Some entries are just visual ("standing for the stud today"); others are full ultrasound exams with follicle measurements. All fields beyond the basics are nullable — the UI surfaces more or fewer fields based on `method`, but it's one entity, one path.

**Typical workflow context:**
- **Live cover (on-site stud):** mostly visual observations — is she standing for the stud, is he jumping
- **AI:** ultrasound-driven. Initial ultrasound to assess cycle position → plan a follow-up ultrasound 36–48 hrs before ready → order semen → breed → post-breeding ultrasound to confirm ovulation
- Either case ultimately answers: in heat or not in heat

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| mare_id | uuid | FK → horses.id |
| observation_date | date | |
| method | enum | visual, ultrasound, palpation, behavior_only |
| in_heat | bool | the binary answer — always required |
| standing | bool | nullable — standing for stallion / teaser |
| stud_interest | text | nullable — "jumping", "not interested", etc. for live cover context |
| left_ovary_follicle_mm | int | nullable, ultrasound only |
| right_ovary_follicle_mm | int | nullable, ultrasound only |
| left_ovary_notes | text | CL present, multiple follicles, etc. |
| right_ovary_notes | text | |
| uterine_edema_score | int | 0–4 standard scale, nullable |
| uterine_tone | enum | flaccid, soft, toned, nullable |
| cervix_notes | text | open/closed/relaxed |
| ovulation_confirmed | bool | nullable — for post-breeding checks |
| performed_by | text | user name or vet name |
| vet_present | bool | flag for "vet did this" vs "we did this" |
| purpose | enum | routine_check, pre_breeding, post_breeding, other — helps with timeline interpretation |
| notes | text | freeform |
| created_at | timestamptz | |

**Single-path principle:** The form has one mode. Required fields are minimal (mare, date, method, in_heat). Everything else fills in as needed. Dictation parses whatever's there; visual obs = sparse record, full ultrasound = dense record. No branching workflows.

### `breeding_events`
One row per breeding action — a cover, AI insemination, embryo transfer, etc.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| mare_id | uuid | FK → horses.id |
| stallion_id | uuid | FK → horses.id, nullable (outside stallions can be records w/ owned=false) |
| stallion_name_freetext | text | fallback if not in horses table |
| method | enum | live_cover, ai_fresh, ai_cooled, ai_frozen, embryo_transfer |
| breeding_date | date | |
| pulled_date | date | nullable — when mare left stallion / breeding ended |
| stallion_station | text | location/facility |
| contract_doc_url | text | Drive link |
| notes | text | |
| season_year | int | derived/indexed for year filters |
| created_at | timestamptz | |

### `ultrasound_checks`
Pregnancy checks tied to a breeding event. Note: heat-cycle ultrasounds live in `heat_observations` — this table is specifically for *pregnancy confirmation* checks at standard intervals (14/16d, 30d, 45d, 60d, etc).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| breeding_event_id | uuid | FK |
| mare_id | uuid | FK (denormalized for easy querying) |
| check_date | date | |
| days_post_breeding | int | computed |
| result | enum | open, in_foal, twins, lost, unclear |
| performed_by | text | user name or vet name |
| vet_present | bool | flag for vet vs self |
| notes | text | |
| image_urls | text[] | optional ultrasound pics |

### `semen_shipments`
Track semen orders for AI breedings. Linked to a breeding event (often created before the event itself).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| breeding_event_id | uuid | FK, nullable (created before event sometimes) |
| mare_id | uuid | FK (for queries before breeding_event exists) |
| stallion_id | uuid | FK → horses.id, nullable |
| stallion_station | text | source facility |
| order_date | date | |
| ship_method | enum | ups, fedex, courier_counter_to_counter, other |
| flight_number | text | nullable — for counter-to-counter air |
| tracking_number | text | nullable |
| shipped_date | date | |
| expected_arrival | date | |
| actual_arrival | date | nullable |
| dose_count | int | |
| semen_type | enum | fresh, cooled, frozen |
| condition_on_arrival | text | notes on quality, temperature, etc. |
| notes | text | |
| created_at | timestamptz | |

### `foaling_events`
The actual birth. Links back to the breeding event that produced it. Also stores foaling-watch fields tracked in the lead-up.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| breeding_event_id | uuid | FK, nullable (in case breeding record was lost) |
| mare_id | uuid | FK |
| foal_id | uuid | FK → horses.id (the new horse record), nullable until born |
| expected_date | date | computed +340 from breeding |
| foaling_watch_started | date | nullable — when active monitoring began |
| actual_date | date | nullable until birth |
| actual_time | time | nullable |
| outcome | enum | live, stillborn, aborted, dystocia_live, dystocia_loss |
| complications | text | |
| vet_attended | bool | |
| placenta_passed | bool | nullable |
| placenta_intact | bool | nullable — important health check |
| placenta_weight_lbs | numeric | nullable |
| notes | text | |

### `foaling_prep_observations`
Pre-foaling monitoring — udder development, waxing, milk testing, etc. Multiple rows per upcoming foaling event.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| foaling_event_id | uuid | FK |
| mare_id | uuid | FK |
| observation_date | date | |
| udder_development | enum | none, filling, full, very_full, dripping |
| waxing | bool | |
| milk_test_done | bool | |
| milk_calcium_ppm | int | nullable — predictor of foaling |
| milk_ph | numeric | nullable |
| behavior_notes | text | restless, isolating, etc. |
| performed_by | text | |
| notes | text | |
| created_at | timestamptz | |

### `health_events` (optional v1, definite v2)
Vaccinations, vet visits, lameness, etc. Light EMR-ish but only what's useful for breeding context.

### `attachments`
Generic photo/file attachments that can be tied to any record. Primary use: ultrasound screen photos, foaling photos, placenta photos, anything captured in-the-moment that should live with the record (not just in a Google Photos album).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| entity_type | enum | horse, breeding_event, heat_observation, ultrasound_check, foaling_event, foaling_prep, semen_shipment |
| entity_id | uuid | the row this is attached to |
| storage_url | text | Supabase Storage URL (preferred for inline display) |
| drive_url | text | nullable — if also synced to Drive |
| caption | text | |
| captured_at | timestamptz | |
| uploaded_by | text | user name |
| file_type | enum | image, video, pdf, other |

**Storage strategy:** Supabase Storage for inline-attached media (fast load in app). The per-horse Google Photos album remains the long-term/family-friendly home for general photos. These two systems coexist: dense clinical photos (ultrasound screens, placenta) live in attachments; everything else flows to the album.

### `costs`
Optional financial tracking. Designed to be added later without schema disruption — left as a sketch for now.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| entity_type | enum | breeding_event, semen_shipment, ultrasound_check, foaling_event, horse, other |
| entity_id | uuid | |
| cost_type | enum | stud_fee, shipping, semen, vet_ultrasound, vet_other, mare_care, registration, other |
| amount_usd | numeric | |
| cost_date | date | |
| invoice_doc_url | text | Drive link |
| paid | bool | |
| notes | text | |

**v1 approach:** include the table and schema, but don't build UI beyond a basic add/list. Real cost reporting is v2.

### `documents`
Generic document attachment table — could just live as URLs on each entity, but a dedicated table allows tagging/search.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| horse_id | uuid | FK, nullable |
| breeding_event_id | uuid | FK, nullable |
| doc_type | enum | contract, coggins, registration, health_cert, vet_record, other |
| drive_url | text | |
| title | text | |
| uploaded_at | timestamptz | |

---

## 3. Key Relationships

```
horses (mare) ──┬─< heat_observations
                │
                ├─< semen_shipments
                │         │
                ├─< breeding_events >─── horses (stallion)
                │         │
                │         └─< ultrasound_checks
                │         │
                │         └─< foaling_events >── horses (foal)
                │                  │
                │                  └─< foaling_prep_observations
                │
                ├─< attachments  (also on any event/check)
                ├─< costs        (also on any event)
                ├─< documents
                └─< health_events
```

Lineage queries fall out naturally:
- "Sissy's offspring" → `SELECT * FROM horses WHERE dam_id = sissy_id`
- "Sissy's full breeding history" → `SELECT * FROM breeding_events WHERE mare_id = sissy_id ORDER BY breeding_date`
- "All foals born in 2025" → join `foaling_events` on year of `actual_date`
- "Conception rate per stallion last year" → aggregate breeding_events + ultrasound results

---

## 4. UI Sketch

### Pages
- **Dashboard** — current season summary: mares bred, confirmed in foal, due dates upcoming, recent activity
- **Horses list** — table, default sort alphabetical by barn name. Filterable (mares, foals, by year of birth, by status). Hybrid dictation: dictating from this page uses full roster matching.
- **Horse detail page** — the main view, tabbed:
  - **Overview** — vitals, lineage (dam/sire shown as links), current status
  - **Breeding History** — chronological list of breeding events, expandable for ultrasounds/foaling
  - **Offspring** — grid/list of her foals, click through to their detail pages
  - **Documents** — Drive-linked files by type
  - **Photos** — embedded Google Photos album or link out
  - **Notes / Timeline** — freeform + auto-generated events
- **Breeding season view** — calendar/timeline of all breeding events for a chosen year
- **Quick entry / dictation** — the AI input page (see §5)

### Design notes
- Mobile-first responsive — most data entry happens at the barn
- Keyboard-and-thumb friendly, big tap targets
- Year filter persistent in URL/state so back-button works naturally

### Visual theme & interaction model
Modeled on the PDM-web project, specifically the MRP pages:
- **Dark theme as default.** Dark background, lighter card/panel surfaces, restrained accent color. Easy on the eyes for long sessions and in barn lighting.
- **Slide-out panels for detail/info** rather than full page navigation where possible. Tap a row → panel slides in from the side (desktop) or up from bottom (mobile) with the detail. Keeps context — the list stays visible behind it.
- **Table-forward layouts** for list views — dense, scannable, sortable columns. The PDM browser's table approach works well and Jack is comfortable with it.
- **Horse list**: table sorted alphabetically by barn name (default). Columns: barn name, registered name, sex, status, last activity. Tap row → slide-out with quick summary + link to full detail page.
- Slide-outs are for quick views and quick entry; the full horse detail page (with tabs) is its own route for deep work.
- Consistent component language across the app — same card style, same slide-out behavior, same table styling everywhere.

> Note for build: pull actual color tokens, spacing, and component patterns from the current PDM-web / MRP pages so BreMan feels like a sibling project. Jack to point Claude Code at that codebase during the design pass.

---

## 5. AI Integration

### Primary flow: dictation → structured record
User taps a mic button, says something like:
> "Bred Sissy to Metallic Cat on May 12, live cover at the Smith ranch. Plan to ultrasound in 16 days."

Or a heat observation:
> "Chiclet's got a 35 on the left, nothing on the right, standing today, mild edema."

System should:
1. Transcribe audio (browser SpeechRecognition API or Whisper via Anthropic-adjacent flow)
2. Send to Claude API with current horse roster + context
3. Claude returns structured JSON — action type + parsed fields
4. UI shows a confirmation card with the parsed action — user taps "Confirm" or edits before save
5. On confirm → write to Supabase

### Voice capture UX
**Walkie-talkie / push-and-hold pattern:**
- Large mic button on screen
- Press and hold to record, release to stop
- Visual feedback: button changes color/state while recording, simple waveform or pulse animation
- Auto-submit on release (no extra "send" tap)
- Mistake correction: a "redo" button on the confirmation card re-opens the dictation
- Designed for one-handed phone use at the barn

### Horse-matching context strategy (hybrid)
How the parser knows which horse "Chiclet" refers to:
- **On a horse's detail page** → that horse is the implicit subject. Dictation defaults to her; "bred to Metallic Cat" needs no mare name.
- **Anywhere else (horse list, dashboard)** → pass the full horse roster (~15-30 horses, trivial token cost) and let Claude match the spoken name.
- The confirmation card always shows which horse was matched, so a mis-match is caught before save.

### Why confirm-before-write
Voice data entry has a non-zero error rate. A confirmation step keeps the DB clean without slowing things down much. Speed of dictation is in the talking, not the tapping.

### Secondary AI features (v2+)
- "Show me all mares not yet confirmed in foal" — natural language query → SQL
- Summarize a mare's career: "Give me Sissy's breeding summary 2022–2026"
- Auto-suggest follow-ups (e.g. "16-day ultrasound due tomorrow for Sissy")

### Implementation notes
- Anthropic API direct, server-side (don't expose key in browser)
- Tool use / structured output for the parse step — define a schema for each action type
- Keep a transcript log so you can audit what was said vs what was written

---

## 6. Google Integration

### Drive
- Per-horse folder convention: `/Horses/{barn_name}_{aqha_number}/`
- Subfolders: `Registration/`, `Health/`, `Contracts/`, `Misc/`
- App stores the folder URL on the horse record
- Use Drive API to list folder contents and display in the Documents tab (read-only embed is fine for v1)
- Service account or OAuth — OAuth is simpler for a single-user tool

### Google Photos
- API is restrictive (deprecated some library scopes in 2025) — verify current state at build time
- Practical approach: create a shared album per horse, store the album's share URL on the record
- Embed via iframe where possible, otherwise just a "View Photos" link

### Gmail (optional v2)
- Auto-file breeding-related emails (vet bills, contract confirmations) by parsing sender + subject
- You've already built similar with Apps Script + Claude API for triage

---

## 7. Tech Stack (concrete)

- **DB**: Supabase (Postgres) — existing account from VetBox-Pro, separate project for BreMan
- **Backend**: Supabase auto-generated REST + RPC, plus Next.js API routes for AI parsing and scheduled jobs
- **Frontend**: Next.js (App Router) + React + Tailwind. Mobile-first responsive design.
- **Auth**: Supabase Auth — email/password, role-based (owner, staff, vet)
- **Hosting**: Fly.io (parity with VetBox-Pro infra, Jack's preferred platform)
- **AI**: Anthropic API — Claude Sonnet (latest) for parsing dictation and contracts. Revisit Haiku for high-volume parsing later if cost becomes a factor.
- **Voice**: Browser SpeechRecognition API, **walkie-talkie / push-and-hold UX** for capture. Whisper as fallback if accuracy is poor.
- **Storage**: Supabase Storage for inline attachments (ultrasound photos, foaling photos). Google Drive for documents (contracts, registrations). Google Photos albums for general horse photo libraries.

---

## 8. Build Phases

### MVP (the "done enough to use this season" target)
Goal: a working tool with horses, core breeding records, mare detail page, dictation for primary events, and basic Google/storage integration. Everything else is post-MVP.

**MVP scope (in)**:
- Schema: `horses`, `breeding_events`, `heat_observations`, `ultrasound_checks`, `foaling_events`, `attachments`, `user_profiles`
- Auth (owner/staff/vet roles, RLS policies written even if only one user initially)
- Horse list + detail page with tabs (Overview, Breeding History, Offspring, Documents, Photos)
- CRUD UI for all MVP entities — clean, responsive, mobile-first
- Dictation (walkie-talkie capture) for: breeding_event, heat_observation, ultrasound_check, foaling_event
- Confirmation flow before any AI-parsed write
- Google Drive folder URL field on horses + Documents tab links
- Google Photos album URL field on horses + Photos tab embed/link
- Supabase Storage for inline-attached photos (ultrasound screen, foaling)
- Foal record auto-creation from foaling_event
- Mare/foal relationship navigation (dam → offspring, foal → dam/sire)
- Basic year filters on breeding history

**MVP scope (out — deferred)**:
- Notifications & alerts (§11)
- `semen_shipments` table and UI
- `foaling_prep_observations` and foaling watch mode
- `costs` table and UI
- `stallion_details` UI (table can exist in schema, populated manually)
- `breeding_contracts` AI parsing
- Computed mare status badges (§18)
- Historical import tooling (§15) — can be done manually in MVP via existing forms with `is_historical=true`
- Dashboard / season views / reports

### Build sequence

**Phase 1 — Foundation**
- Supabase project, schema migration (full schema including deferred tables so we don't migrate twice)
- RLS policies for all tables
- Next.js scaffold on Fly.io, auth working
- Seed with current horses (mares + known offspring)

**Phase 2 — Core CRUD + horse detail page**
- Horses CRUD
- Horse detail page with tabs
- Breeding events, heat observations, ultrasound checks, foaling events — all CRUD via forms
- Attachments upload to Supabase Storage
- Dam/sire/offspring navigation

**Phase 3 — Dictation**
- Walkie-talkie voice capture component
- Browser SpeechRecognition → transcription
- API route: transcript + horse roster → Claude Sonnet with tool-use schema → structured action
- Confirmation card UI
- Write-on-confirm to Supabase
- Audit log of transcripts

**Phase 4 — Google integration**
- Drive folder URL on horses
- Documents tab listing Drive folder contents (optional via Drive API, or just link out)
- Photos album URL + embed/link in Photos tab

**Phase 5 — MVP polish**
- Year filters, sorting, list views
- Responsive design pass — phone-first review of every screen
- Empty states, error handling
- Production deployment

### Post-MVP roadmap (rough order)
1. Notifications & alerts (high value during breeding/foaling season)
2. Foaling prep observations + foaling watch mode
3. Semen shipments
4. Contract parsing (AI)
5. Costs tracking UI
6. Stallion details UI
7. Computed mare status badges
8. Historical import tooling (CSV/JSON scripts)
9. Reports / dashboard / season views

---

## 9. Open Questions

### Resolved
- **Outside stallions**: Full horse records with `owned=false`. 4–5 outside stallions per year, mostly consistent year-over-year. One or two on-site studs also consistent. Full records keep queries uniform and let us build lineage history on repeat sires.
- **Embryo transfer**: Recipient mares treated primarily as vessels — minimal tracking. ET happens mostly on outside (non-owned) mares. Solution: ET is a `method` on the breeding event; if a recipient mare needs real tracking (shots, etc.), she can be added as a horse later. No separate recipient entity in v1.
- **Heat cycles**: Track them separately and in detail. This is significant — see §2 schema update for new `heat_observations` table. Includes left/right ovary, follicle size in mm, standing/teasing behavior, uterine edema, etc.
- **Connectivity**: Online-only is fine. Mobile-first UI is critical — phone in pocket at the barn, tap a button, dictate a note. Desktop interface also wanted for deeper work / reports.

### Still open
- [ ] Multi-cycle within a season — model as separate breeding_events with same season_year, or a parent "breeding_cycle" record? (Probably just multiple events. Simpler.)
- [ ] Photos: is public-shared-album acceptable for privacy? Some contracts/registrations probably shouldn't be on a public album, but photos likely fine.

---

## 10. Handoff Notes for Claude Code

When this moves to Claude Code:

**Project setup**
- Repo name: `breman` (or similar)
- Supabase project: new project, separate from VetBox-Pro
- Fly.io app: `breman` — region close to Wisconsin (`ord`)
- Next.js App Router + Tailwind + Supabase JS client
- Environment vars: Supabase URL/key, Anthropic API key, any Google OAuth credentials

**Schema-first**
- Migrate the FULL schema from §2 on day one, including deferred-MVP tables (`semen_shipments`, `foaling_prep_observations`, `costs`, `breeding_contracts`, `stallion_details`). Avoids a second migration when those features come online.
- Write all RLS policies up front for owner/staff/vet roles even though only one user exists initially.
- Use Supabase migrations directory so the schema is version-controlled.

**Architecture**
- Client hits Supabase directly for normal CRUD via the JS client (with RLS doing the work)
- Next.js API routes only for: AI parsing endpoint, scheduled jobs (when notifications come online), any Google API proxying that needs the API key server-side
- The AI parsing endpoint is stateless — pass full horse roster as context every call (15 horses is nothing token-wise)

**Build order priority**
- Build the horse detail page early — it's the centerpiece and informs everything else
- Get the dictation flow working with one event type (heat_observation) before generalizing
- Mobile-first from the start — design every screen on phone first, expand to desktop second
- Don't bother with Google Photos API until v2 — just embed/link albums via stored URL

**AI specifics**
- Sonnet (latest) for parsing
- Use tool-use / structured output for parse step — define schema per action type
- Confirmation step required before any DB write from AI parse
- Log every transcript + parsed output for audit and future fine-tuning

**Things to NOT do in MVP**
- Don't build notifications/alerts yet
- Don't build the contract PDF parser yet
- Don't build foaling watch mode yet
- Don't build cost UIs yet
- Don't build computed mare status badges yet

---

## 11. Notifications & Reminders

The system should proactively surface time-sensitive items. Two delivery channels:

**In-app dashboard alerts** (v1)
- Card-style alerts on the dashboard, dismissible
- Categories: Overdue, Due Today, Upcoming (next 3 days)

**Push / email** (v2)
- Daily digest email summarizing alerts
- Optional SMS for time-critical (foaling watch active)

### Alert rules to implement

| Trigger | Condition | Category |
|---|---|---|
| Pregnancy check due | 14d post-breeding, no ultrasound_check yet | Due Today / Overdue |
| Subsequent preg check | 30d / 45d / 60d post-breeding, last check was "in_foal" | Upcoming |
| Mare returning to heat | Last heat_observation 16–18d ago, no breeding since | Upcoming |
| Semen arrival | semen_shipment expected_arrival = today, actual_arrival null | Due Today |
| Semen overdue | expected_arrival past, actual_arrival null | Overdue |
| Foaling window opens | 320d post-breeding | Upcoming (start watch) |
| Active foaling watch | 330d+ post-breeding, no foaling_event yet | Due Today (daily) |
| Foaling overdue | 350d+ post-breeding, no foaling_event yet | Overdue |
| Post-breeding ovulation check missing | Breeding event 2+ days old, no post_breeding heat_observation | Overdue |

### Implementation
- A scheduled Supabase Edge Function (daily) computes the alert set and stores in an `alerts` table
- UI reads `alerts` on dashboard load
- Mark-as-dismissed flag per user
- Each alert links directly to the relevant horse/record for one-tap action

---

## 12. Users & Access

**v1 user model:**
- Two human users to start: Jack and Natalie — primary operators, full access
- Vet — own login, can view records and add heat_observations / ultrasound_checks / foaling_events. Cannot delete or modify others' entries.

**Supabase Auth setup:**
- Email/password (magic link as alternative)
- A `user_profiles` table with `role` enum: `owner`, `staff`, `vet`
- RLS policies: owner/staff get full CRUD; vet gets read on horses + insert on observation/check tables, read on their own previous entries
- The `performed_by` field on observations/checks auto-populates from the logged-in user (no manual entry, no typos)

### `user_profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK = auth.users.id |
| display_name | text | shown in performed_by fields |
| role | enum | owner, staff, vet |
| email | text | |
| phone | text | for SMS alerts later |
| created_at | timestamptz | |

---

## 13. AQHA & Industry Conventions

### Year/age handling
AQHA uses a universal foal birthday of **January 1**. A foal born any time in 2027 is officially a 2027 foal and ages up on Jan 1 each year.

**Implications for the data model:**
- `aqha_age_year` on `horses` = the year the horse counts as for AQHA. For owned horses this is the year of their actual `dob`. For an embryo or in-utero foal we don't pre-create the horse record — we wait until birth.
- `season_year` on `breeding_events` refers to the breeding season (calendar year of the breeding). The resulting foal's `aqha_age_year` will normally be `season_year + 1`.
- Display logic: "2026 season" = breedings done in 2026 → foals in 2027. The UI should label seasons clearly to avoid confusion.

### Foal naming flow
1. Foal born → `horses` record created. `registered_name` null, `barn_name` null.
2. UI displays a placeholder: "{dam_barn_name}'s baby {filly|colt}" — e.g. "Chiclet's baby filly"
3. Barn name typically assigned within days/weeks → `barn_name` set.
4. Registered name comes later (months) → `registered_name` set when AQHA paperwork is filed.

A computed `display_name` getter on the horse record returns: `registered_name` → `barn_name` → placeholder, in that order. Use this everywhere in the UI so the fallback is automatic.

---

## 14. Workflow Reference (for context)

### AI breeding cycle (most common)
1. Initial ultrasound — assess where the mare is in her cycle → `heat_observations` row, `method=ultrasound`, `purpose=routine_check`
2. Follow-up ultrasound 36–48 hrs before predicted readiness → another `heat_observations` row, `purpose=pre_breeding`
3. Order semen
4. AI performed → `breeding_events` row
5. Post-breeding ultrasound to confirm ovulation → `heat_observations`, `purpose=post_breeding`, `ovulation_confirmed=true/false`
6. 14–16 day pregnancy check → `ultrasound_checks`, `result=in_foal|open|twins|unclear`
7. Subsequent confirmation checks at 30/45/60 days as appropriate

### Live cover (on-site stud)
1. Visual observation — is mare standing, is stud interested → `heat_observations`, `method=visual`
2. Once standing confirmed, breed → `breeding_events`, `method=live_cover`
3. Repeat as needed during heat
4. 14–16 day pregnancy check → `ultrasound_checks`

---

## 15. Historical Data Import

Significant historical records exist across multiple sources — written notes, foal photos, semen shipment records, breeding contracts. Need a path to load this into the system without it being painful.

### Approach
**Phase A — schema-level (no UI):**
- Build a CSV/JSON import script that takes structured historical data and bulk-inserts into the right tables
- Skip notification/alert logic for historical inserts (a flag on the import or based on date being > 90 days old)
- Run as needed via Claude Code during initial population

**Phase B — UI-driven manual entry:**
- An "Add historical event" mode on the horse detail page that uses the same forms but with `is_historical=true` flag
- Bypasses workflow validations (e.g. doesn't require a follow-up ultrasound to be planned)
- No alerts generated

**Phase C — AI-assisted parsing (nice to have):**
- Drop a photo of handwritten breeding notes, a scan of a vet receipt, or paste a block of notes → Claude parses into structured records → confirmation flow → save
- Same dictation pipeline, just with image/text input instead of audio

### Data sources to plan around
- Written notes (paper) — photo + AI parse, or manual entry
- Old spreadsheets — CSV import script
- Foal photos — bulk upload to attachments table or just to per-horse Google Photos album
- Past semen shipments — likely manual, fewer fields filled
- Past breeding contracts — PDF upload to Drive + link to past breeding_events; AI parse optional

### Schema flag
Add `is_historical bool default false` to: `breeding_events`, `heat_observations`, `ultrasound_checks`, `foaling_events`, `semen_shipments`. Lets queries and alert logic filter them out cleanly.

---

## 16. Stallion Reference Data

Outside stallions need more than basic horse fields. Sidecar `stallion_details` table joined 1:1 to `horses` where `sex=stallion` — keeps the `horses` table clean and only loads stallion-specific data when needed.

### `stallion_details`
| Column | Type | Notes |
|---|---|---|
| horse_id | uuid | PK + FK → horses.id |
| primary_station | text | where he stands |
| station_contact_name | text | |
| station_phone | text | |
| station_email | text | |
| station_address | text | |
| current_stud_fee | numeric | |
| booking_fee | numeric | |
| chute_fee | numeric | nullable |
| collection_days | text | e.g. "M/W/F" for cooled semen |
| semen_type_available | text[] | fresh, cooled, frozen |
| lfg_terms | text | live foal guarantee terms (freeform v1) |
| seven_panel_status | enum | clear, n/n, carrier_*, unknown — covers HYPP, PSSM1, MH, HERDA, GBED, IMM, LWO |
| seven_panel_details | text | nullable — full breakdown if mixed |
| seven_panel_doc_url | text | link to test result |
| color_test_results | text | EE/Ee, etc. nullable |
| breed_registry_notes | text | AQHA, APHA, etc. requirements for registration |
| notes | text | |
| updated_at | timestamptz | |

Same pattern could later apply as `mare_breeding_details` for mare-specific reproductive metadata (her own panel test, history of difficult cycles). Add when needed.

---

## 17. Contract Parsing (AI)

Breeding contracts are PDFs in Drive. AI extraction is a strong fit here — contracts are dense, structured-but-not-structured, and re-entering data manually wastes the contract you already have.

### Useful fields to extract
- Stallion name, mare name (if pre-filled)
- Stud fee, booking fee, chute fee, shipping cost / responsibility
- LFG terms (what triggers a rebreed)
- Booking date / season
- Substitute mare clause
- Embryo transfer allowance
- Registration requirements / paperwork deadlines

### Flow
1. User uploads contract PDF or links existing Drive file to a breeding_event
2. Background job sends to Claude API with extraction schema (tool use / structured output)
3. Parsed fields populate `breeding_contracts`; user reviews + confirms
4. Confirmed financial fields can auto-populate `costs` rows

### `breeding_contracts`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| breeding_event_id | uuid | FK, nullable (contract often exists before breeding) |
| mare_id | uuid | FK, nullable |
| stallion_id | uuid | FK |
| drive_url | text | source PDF |
| stud_fee | numeric | |
| booking_fee | numeric | |
| chute_fee | numeric | |
| shipping_cost | numeric | |
| shipping_responsibility | enum | mare_owner, stallion_owner, split |
| lfg_terms | text | |
| substitute_mare_allowed | bool | |
| embryo_transfer_allowed | bool | |
| registration_requirements | text | |
| signed_date | date | |
| season_year | int | |
| parse_status | enum | unparsed, parsed_unconfirmed, confirmed, manual_entry |
| parsed_raw_json | jsonb | what Claude returned, for audit/re-parsing |
| notes | text | |
| created_at | timestamptz | |

---

## 18. Mare Status (Computed Display)

Each mare gets a status badge on her detail page and in any list view. Not a stored field — computed from latest events so it can't drift.

### Status values
- `not_breeding` — explicit opt-out for this season
- `open` — no current breeding events for this season
- `in_heat` — heat_observation in last 5 days with `in_heat=true`
- `bred_pending_check` — breeding_event exists, no ultrasound_check yet
- `confirmed_pregnant` — last ultrasound_check `result=in_foal`
- `lost` — ultrasound_check `result=lost` after previous confirmation
- `foaling_watch` — confirmed_pregnant AND 320+ days since breeding
- `foaled` — foaling_event in this season
- `nursing` — foaled within last 4 months

### Implementation
- Compute server-side in a view or RPC function for consistency
- Display as a small colored badge on the mare's detail page
- Dashboard can group/filter by status
- Low priority for sorting/driving UI logic — informational primarily

---

## 19. Adding New Horses (Flows)

Three distinct entry paths, all landing on the same `horses` record:

### A. Born on-site (foaling event creates the horse)
- Foaling event in the system triggers creation of a `horses` row
- Sex set from foaling notes (filly/colt)
- `dam_id` and `sire_id` auto-populated from the breeding_event
- `dob` = foaling_event.actual_date
- `aqha_age_year` = year of dob
- `barn_name` and `registered_name` null initially → placeholder display

### B. Purchased / brought in from outside
- "Add horse" form on horses list
- Fields: registered_name, barn_name, aqha_number, sex, dob, color, markings, sire_id, dam_id (free text if unknown), acquired_date
- `owned=true`, `acquired_date=today` by default
- If purchased mare has known breeding history, use historical import (§17) to backfill

### C. Filly graduates to broodmare (in-system transition)
- Horse already exists as a young filly
- No data migration needed — same record
- UI affordance: a "move to broodmare program" toggle that simply makes her appear in the mare-centric views (broodmare dashboard, breeding planning, etc.)
- Could be implemented as a `broodmare_active bool` field on horses, default false. Foals/young horses don't clutter the broodmare list until activated.

**This year's expected case:** a homebred filly bred and foaled on-site, now ready to enter the broodmare program. The toggle in case C handles this cleanly — flip the flag, she shows up in the breeding views, no record duplication.

---

*Last updated: 2026-05-15*
