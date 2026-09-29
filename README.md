# Memory Garden 🌷

A warm, gamified, personal memory adventure for people living with dementia — built from their own
photographs, voices and stories, and guided by **Mimo**, a gentle garden friend. Nobody is being tested.

- **Patients** explore an adventure map (5 worlds × 10 places), play 10 kinds of gentle activities made
  from their own memories, earn Memory Coins for *taking part*, grow a garden and dress Mimo.
- **Caregivers** upload memories to Cloudinary, name the people Cloudinary's face detection finds,
  mark things in photos, approve what may appear in activities, build stories and albums, set
  comfort/accessibility/consent options, and read non-clinical activity insights.

## Quick start

```bash
npm install
cp .env.example .env.local      # then add your Cloudinary credentials
npm run dev                      # http://localhost:3000
```

1. Create a caregiver account (or run `npm run seed:demo` with the server running — demo
   credentials are in `.env.example`).
2. Add the person you care for → **Memories** → upload photos → name people → **Approve**.
3. **Open Memory Garden for …** — the device switches to patient mode and the caregiver area locks
   until the caregiver's password is entered again (tap **Caregiver** at the bottom of the home screen).

Other scripts: `npm test` (27 unit + integration tests), `npm run typecheck`, `npm run lint`,
`npm run build`, `npm run verify:cloudinary` (live check of your Cloudinary account).

## Configuration (`.env.local`)

| Variable | Purpose |
|---|---|
| `CLOUDINARY_URL` *or* `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Required for uploads, search and all photo activities. Server-side only. |
| `MG_ROOT_FOLDER` | Root folder (default `memory-garden`). |
| `MG_DELIVERY_TYPE` | `authenticated` (default, every URL signed by the server) or `upload`. |
| `MG_AI_CAPTIONING`, `MG_AI_OBJECT_DETECTION` | Optional Cloudinary AI add-ons (must be registered in your console). Suggestions are only used after caregiver approval. |
| `DATABASE_URL` | Optional external PostgreSQL. Empty = embedded PostgreSQL (PGlite) stored in `PGLITE_DIR` (`./data/pglite`). |

Without Cloudinary credentials the app runs, but only the illustrated everyday cards (Daily Life
Match) are playable; the dashboard shows a setup notice.

## Importing from the previous backend (memory-app-backend)

The earlier Express + MongoDB backend is merged in as a one-time import rather than a second
server. Set `LEGACY_MONGODB_URI` (and `LEGACY_MONGODB_DNS_SERVERS` if SRV lookups fail) and a
**Bring memories from the previous Memory Garden** card appears on the caregiver home page.

- The caregiver proves ownership with the old account's email and password (checked against its
  bcrypt hash; never stored). The account becomes a patient linked to that caregiver.
- Each photo of each old memory becomes one memory, re-uploaded as a private, face-detected asset
  with tags and structured metadata; the original Cloudinary files are left untouched. Titles,
  years, events, descriptions (as captions), tags, people (relationships mapped, e.g. "Mom" →
  mother), albums and who-appears-in-which-memory come across.
- Everything arrives as **Needs review** — nothing reaches activities until the caregiver approves it.
- Re-running only adds what's new (`source_ref` keeps imports idempotent).
- Not imported on purpose: scores, stars, Easy/Medium/Hard, timers and the fox/owl characters —
  those mechanics conflict with this app's no-pressure, consent-based design.

## How Cloudinary is used (the media intelligence pipeline)

- **Organisation** — dynamic folders `memory-garden/patients/<P001>/<category>` (fixed-folder
  accounts detected via the Admin API and handled), tags (categories, events, `patient-p001`),
  contextual caption/alt, and **13 structured metadata fields** (`mg_patient_id`, `mg_category`,
  `mg_event`, `mg_year`, `mg_people`, `mg_relationships`, `mg_location`, `mg_language`,
  `mg_importance`, `mg_caption`, `mg_game_eligible`, …) created automatically.
- **Privacy** — assets are `authenticated`; the browser only ever receives server-signed URLs.
- **Retrieval** — activities and *Find the Memory* use the **Search API**
  (`metadata.mg_patient_id="P001" AND metadata.mg_game_eligible="yes"`, `tags="birthday"`, year
  ranges…). The database stays authoritative for consent: a memory the caregiver keeps out never
  appears, even before the search index updates; newly approved memories are included while
  indexing catches up (shown as "mixed" source in insights).
- **Face detection** — `faces: true` on upload returns face boxes; caregivers say who each person is.
  Cloudinary never identifies anyone.
- **Transformations as game mechanics** — progressive blur reveal (`e_blur`), face-focused crops
  (confirmed face boxes or `c_thumb,g_face`), object/region crops, `e_blur_region` to hide an object
  (*What's Missing?*), `c_fill,g_auto` + signed `c_crop` tiles (*Picture Puzzle*), video poster
  frames, MP3 transcoding of recorded greetings, and responsive `srcset` with `f_auto,q_auto`
  (`q_auto:eco` for Save-Data / slow connections / the "save mobile data" setting).

## Kind by design

- No "easy/medium/hard", no scores, no red crosses. A different answer is gently set aside and the
  picture gets clearer; after two tries Mimo simply shows the answer warmly.
- **Challenge only with consent.** After three comfortable sessions of an activity Mimo asks
  *"Would you like to try a little more of a challenge?"* — **Yes, let's try! / Keep it familiar. /
  Maybe later.** Nothing changes without "yes"; after effortful sessions Mimo may offer a gentler
  setting. Caregivers can set a ceiling or reset. Every answer is logged in Insights.
- Coins reward participation; they are never removed. Skipping is always free.
- Break reminders, preferred session length, calm mode, clearer colours, three text sizes, gentle
  synthesized sounds (none for "wrong"), read-aloud (Web Speech API) and optional spoken commands,
  English and Telugu.
- Insights describe game activity only and carry a clear non-clinical disclaimer.

## Architecture

Next.js 16 (App Router, React 19, TypeScript, Tailwind v4) · route handlers as the API · Drizzle ORM
on PostgreSQL (embedded PGlite by default) · Cloudinary Node SDK · zod validation · Vitest.

```
src/lib/cloudinary   client, structured metadata, uploads/sync, Search API, signed transformation presets
src/lib/game         worlds/levels, challenge rules, pool (Search-first retrieval), 10 generators,
                     engine (sessions, server-side validation, hints, rewards), progress/unlocks, daily
src/lib/services     patient (home, shop, garden, album, journey), caregiver, memories, insights
src/app/api          auth, caregiver/*, play/*          src/app/play  patient UI     src/app/caregiver  dashboard
```

Security: scrypt password hashes, hashed session tokens in httpOnly cookies, per-patient
authorization on every route, same-origin checks on writes, sign-in rate limiting, audit log,
JSON data export and full deletion (optionally including Cloudinary media).

## Status and honest notes

- **Verified here:** type-check, lint, production build, 30 automated tests (game logic, all 10
  generators producing signed transformations, and an end-to-end engine test on embedded
  PostgreSQL), and a browser walk-through of sign-in → patient profile → patient mode → character
  creation → map → Daily Life Match → rewards → shop purchase → garden, in English and Telugu.
- **Verified live on Cloudinary:** `npm run verify:cloudinary` passes (dynamic folders, structured
  metadata, authenticated upload with face detection, Search API, all game transformations,
  unsigned URLs refused), and uploads → approval → Search-backed activities work through the app.
- **Import from the previous backend:** covered by automated tests against fixture data; the live
  run needs this computer's IP allowed in MongoDB Atlas → Network Access.
- Telugu text was written carefully but should be reviewed by a native speaker; Telugu read-aloud
  needs a Telugu voice on the device.
- The service worker (offline-friendly caching) is registered in production builds only.
- `data/` holds the local database; delete it (with the server stopped) to start fresh.
