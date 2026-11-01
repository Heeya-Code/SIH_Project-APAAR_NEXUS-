# APAAR NEXUS: National Academic Identity & Intelligence Network

> **© 2026 Heeya-Code. All rights reserved.** Proprietary code, not open source. Viewing is allowed; copying, reuse or redistribution of any part requires written permission. See [LICENSE](LICENSE).

Smart India Hackathon 2026, problem statement **SIH26263**. A prototype, **not an official AICTE system**.
All data is synthetic. There is no live connection to APAAR or AICTE databases.

## Status (Phases 1 to 6 built; see docs/LIMITATIONS.md for what is simulated)

EnrolTrust ("One student, one APAAR ID, one verified enrolment.") is a working prototype for SIH 2026, problem statement SIH26263. Everything runs on **synthetic data**, and **no real APAAR or government system is connected**; verification uses a clearly labelled simulated registry.

| Area | What works |
|---|---|
| Submission | Guided CSV upload, preview, validation, row-by-row fixes, partial processing (valid rows go through, invalid rows wait), correction report, versioned resubmission, idempotent re-upload |
| Five checks | Duplicates, APAAR format and simulated verification, intake per programme, data consistency, cross-institution clashes, each with a plain-language reason and fix |
| Explainable alerts | Rule-based anomaly checks (NRI/OCI/FN spikes, enrolment spikes, bulk files, category skew, missing IDs) and an Isolation Forest screening aid. Never presented as proof |
| AICTE | Command Centre, Live Seat Ledger, Trust Scores, regional analytics and heatmap, alert and conflict review, directory, CSV and PDF reports |
| Consent | Student approves a chosen subset of fields; signed Ed25519 record; QR; verifier sees only approved fields; expiry, withdrawal, Student Consent Log |
| Security | Server-side sessions, RBAC in code, encrypted PII, keyed-hash matching, hash-chained audit log, rate limits, scoped queries |

Documents: `docs/ARCHITECTURE.md`, `docs/DATA_DICTIONARY.md`, `docs/TRUST_SCORE.md`, `docs/DEMO.md`, `docs/SECURITY.md`, `docs/API.md`, `docs/LIMITATIONS.md`.

## Look and feel

- **Layout modelled on aiopstool (Partnerly):** a floating glass navigation bar across the top (no sidebar), a gradient Search pill, a mono status line above each page title, a bold headline whose last word is set in italic serif, pill buttons and large glass cards over a faint grid. Below 1280px wide the navigation moves into a slide-in drawer.
- **Five accent swatches** (teal, violet, blue, pink, gold; violet by default) retint buttons, highlights, the logo and the background glow. On screens narrower than 1400px they are in the account menu.
- **Dark theme by default**, with a light theme one click away (sun/moon button). Theme and accent are remembered on the device and applied before the page paints, so they never flash.
- **Follows your cursor:** a soft glow tracks the pointer, every card lights up with a spotlight and edge glow under the cursor, stat cards tilt slightly, buttons press on click. All of this is off on touch screens and for anyone whose system asks for reduced motion.
- **Search anywhere:** click Search or press Ctrl K (⌘K on a Mac) to jump to a page or, for AICTE roles, to an institution in your scope.
- Both themes pass the WCAG 2.0/2.1 A and AA audit on all 39 audited page states (`THEME=light python3 scripts/a11y-axe.py` checks the light theme).
- Visual details follow the reference designs, always on real data. See `docs/UI.md` for what was deliberately not copied (for example a real India boundary map or mascot "AI" chatbots).

## Run it

Requirements: Node 20+ and PostgreSQL 14+.

```bash
npm install
npm run setup:env             # creates .env (never overwrites one) with freshly generated secrets
#   then open .env and replace YOUR_PASSWORD in DATABASE_URL with your PostgreSQL password
#   create the empty database apaar_nexus first (pgAdmin: right-click Databases, Create) or: createdb apaar_nexus
npm run db:setup              # generate client, apply migrations, seed (about 30 seconds)
npm run dev                   # http://localhost:3000
```

Windows (PowerShell) works the same way: `npm install`, `npm run setup:env`, edit `.env` in any editor, `npm run db:setup`, `npm run dev`. If a command says `DATABASE_URL is not set`, the `.env` file is missing or you are in the wrong folder.

`npm run db:seed` wipes and rebuilds the demo data at any time. It refuses to run when `NODE_ENV=production`.
Demo password for every account: `Nexus@Demo2026` (set `DEMO_PASSWORD` to change it before seeding).
Production-mode serving on plain HTTP in Safari or over a LAN: set `INSECURE_COOKIES=1`.

## Upgrading an existing local database (keeps your data)

If you already ran `npm run db:setup` for an earlier version, do **not** reseed. Run:

```
npx prisma migrate deploy      # applies the additive migration (one new table, a few columns)
npm run db:phase2              # conflict detection, anomaly analysis, consent history, demo CSVs (never wipes)
```

## Test it

```bash
npm run check:all      # everything below, with a fresh server per suite (see scripts/run-all-checks.sh)
```
or individually:

```bash
npm test                                  # 89 unit tests (validation engine, signing and QR, Trust Score, anomaly rules, audit canonicalisation)
npm run build && npm start                # then, against a freshly started server:
npm run verify:stage1                     # 86 checks: roles, isolation, masking, audit, figures
npm run verify:closeout                   # 81 checks: 30 pages x 7 roles, exact sidebar per role, chart data and Seat Ledger vs SQL, verification API
npm run verify:phase2                     # 92 checks (no server needed): upload pipeline vs the demo manifest, five checks, consent, signed records, tamper/expiry/revocation, Trust Score vs SQL, audit chain. Restores the database afterwards
python3 scripts/a11y-axe.py               # WCAG A/AA audit of 39 page states across all roles, dark theme (THEME=light for the light theme) (needs: pip install playwright && playwright install chromium)
python3 scripts/browser-closeout.py       # 16 browser checks: logins, sidebar links, charts
python3 scripts/browser-ui.py             # 37 browser checks: collapse, menus, map, table, dialogs, drawer, skeleton, keyboard
python3 scripts/browser-demos.py out/     # 56 checks: DEMO A, B and C driven through a real browser, with a screenshot at each step (start the server with DEMO_MODE=true)
python3 scripts/capture-dashboards.py out/ # 37 screenshots: every role's main pages plus mobile views (THEME=light for the light set)
python3 scripts/capture-screens.py out/   # regenerate the screenshots in docs/screenshots
```
Use a freshly started server for each suite: login attempts (30 per IP per 10 minutes) and the verification quota are rate-limited in memory, so repeated suite runs against one server correctly start being refused. `check:all` handles this.

Screenshots are in `docs/screenshots/`: `dashboards/` (every role, desktop and mobile, dark theme), `dashboards-light/` (the same pages in the light theme), `demo-flows/` (the three demonstrations, step by step), and the earlier `before/`, `after/` and `comparison/` UI upgrade sets.

Note: the demonstration flows deliberately leave the Sahyadri upload and a consent record in place (Demo B needs them). Run `npm run demo:reset` to return to the clean seeded state; `browser-ui.py` expects that clean state.

## Run the three demonstrations

See `docs/DEMO.md` for the click-by-click script. In short: `npm run db:setup`, then `npm run dev`. Demo files are in `demo-data/`. `npm run demo:reset` returns Sahyadri to its pre-upload state so Demo A can be repeated.

## Try each role (password `Nexus@Demo2026`)

| Sign in as | What to look for |
|---|---|
| `admin@aicte.demo` | Command Centre. Switch years. Click the Maharashtra tile. Sahyadri shows "Submission pending" for 2026-27. Open the audit trail. |
| `officer.west@aicte.demo` | Same page, only Maharashtra, Gujarat and Goa institutions. `/audit` is denied. |
| `superadmin@nexus.demo` | Platform overview, then `/admin/users` to revoke a user's sessions or deactivate them, Institutions, Configuration (weights, thresholds, signing key id). `/audit`: "Verify audit chain". |
| `admin@sahyadri.demo` | Own institution only. **Upload centre** (Demo A), Submissions, Trust score, Data operators. Students: choose 2024-25, press **Reveal** on an ID, then check the audit trail. |
| `operator@sahyadri.demo` | Can upload and review submissions, but no Reveal control, no operators page and no audit access. Try **Check an APAAR ID** with `999999999001`. |
| `admin@aravalli.demo` | 124% ordinary-seat use in 2026-27 (above approved intake). |
| `admin@sabarmati.demo` | 83 supernumerary admissions, NRI far above the illustrative 15% cap. |
| `admin@deccan.demo` | Many supernumerary admissions, all within caps: correctly **not** flagged. |
| `student@nexus.demo` | Own identity with three separate verification levels, a shareable code, Verification requests, Consent history (approved, declined, withdrawn and expired examples) and My QR verification. |
| `student.multi@nexus.demo` | Same APAAR ID found at a second institution (flagged, never auto-merged), plus a live pending request waiting for a decision. |
| `verifier@meridian.demo` | New request, Scan or enter a code (camera, QR picture or typed), Request history. Sees only what a student approved. `board@statetech.demo` is a second verifier organisation, refused for records granted to Meridian. |

Wrong passwords five times locks an account for 15 minutes. `verify:closeout` deliberately exhausts one account's verification-API quota (30 per 10 minutes); restart the server to reset it.

## What the seed plants (ground truth in `.seed/manifest.json`)

38 exact cross-institution matches, 14 potential duplicates (name variants, transposed digits, both IDs missing),
6 conflicting identities (same ID, different person), 12 within-institution duplicates, ordinary admissions above
intake (Aravalli 2025-26 and 2026-27, Gomti 2025-26), an NRI cap breach (Sabarmati 2026-27), five pending
submissions, repeated resubmissions (Hooghly 2025-26), and falling APAAR coverage gaps by year.

## Design decisions to review

- **Three identity tiers** are always shown separately: structural (working), internal duplicate check (working),
  authoritative APAAR verification (**not available** without authorised API access).
- The APAAR format rule is configurable (`APAAR_ID_PATTERN`, default 12 digits). Confirm it against the official spec.
- Regulatory thresholds (`ComplianceRule` table) are **illustrative defaults**. Verify against the current AICTE handbook.
- Permissions live in code (`src/lib/auth/permissions.ts`) so they can be reviewed and unit-tested.
- The state map is a tile cartogram, not a boundary map, which avoids boundary disputes.
- Rate limiting is in-memory (per instance); use Redis for multi-instance deployments.
- The verification adapter's mock answers from synthetic records and is never authoritative.

## Layout

```
prisma/            schema, migrations, seed.ts (wipes) and seed-phase2.ts (additive), seed-data.ts
demo-data/         three synthetic CSVs for Demo A and manifest.json (what the engine must find)
src/components/    design system (ui/), app shell, charts, seat ledger, trust view, guide (hint, stepper)
src/lib/           crypto, audit chain, APAAR validator, auth, permissions, queries, submissions/ (the five checks),
                   analysis/ (conflicts, anomalies, Isolation Forest), trust/, consent/, credentials/ (signing, QR), reports, API layer
src/app/           pages (landing, login, role portals) and src/app/api/v1 (REST)
scripts/           verification suites, browser suites, screenshot capture, demo reset, offline-migration-sql.mjs
```
