# UI and design system

Presentation-layer upgrade only. No database, API contract, authentication or permission was changed.

## Principles
- Institutional, calm, data-first: deep navy, blue and teal on cool white. No decorative gradients, no oversized headings.
- Honest by construction: nothing in the UI is a placeholder metric. Features that do not exist yet say so in plain words.
- Accessible: WCAG 2.0/2.1 A and AA checked with axe-core across every role's pages (0 violations).
- Motion only where state changes (sidebar, active-nav indicator, map detail panel, verification result, dialogs). Load-in effects are CSS-only. `prefers-reduced-motion` disables all of it. Charts do not animate.

## Structure
```
src/components/ui/        primitives in the shadcn/ui pattern (cva + clsx + tailwind-merge + Radix):
                          button, card, badge, skeleton, tooltip, dropdown-menu, sheet, alert-dialog, table
                          kit.tsx = Panel, PageHeader, StatCard, KeyFact, Meter, Empty, Pill (API-compatible with the old ui.tsx)
src/components/shell/     app-shell.tsx: collapsible sidebar, topbar, account menu, mobile drawer, skip link
src/components/           charts.tsx (Recharts), seat-ledger.tsx, tile-grid.tsx, page-skeleton.tsx, year-switcher.tsx, brand.tsx, nav.ts
src/lib/geo/              india-tiles.ts (tile cartogram), tile-colors.ts (classed palettes with guaranteed contrast)
```
shadcn/ui's CLI could not reach its registry from the build sandbox, so its components were written by hand in the same pattern. They are ordinary files you own and can edit.

## Tokens (`src/app/globals.css`, Tailwind 4 `@theme`)
Colours `navy-950..600`, `blue`, `teal`, `amber`, `red`, `green`, `slate`, `paper`, `line`. Radii `rounded-card` (12px), `rounded-control` (8px). Shadows `shadow-card`, `shadow-pop`. Fonts: Source Serif 4 (headings and figures), IBM Plex Sans (interface), IBM Plex Mono (identifiers only), Noto Sans Devanagari (wordmark subtitle).

## Product concept in the interface
- **EnrolTrust line** "One student, one APAAR ID, one verified enrolment." on landing, login and the app footer.
- **Live Seat Ledger** (national and per institution): approved intake against ordinary seats filled, seats still open, seats filled above intake, and supernumerary admissions reported separately. Recalculated from submitted records on every page load.
- **Privacy and audit transparency**: masked identifiers, an audited reveal, the tamper-evident audit trail with chain verification, and a Consent Log panel on the student page that reads the real consent table.
- Not built yet, and deliberately not faked: Institution Trust Score, the five anomaly and validation checks, QR credential verification, consent controls (the log is empty until they exist).

## Route guards and loading skeletons
Each route has a `layout.tsx` that enforces its permission and a `loading.tsx` skeleton. The guard must sit **above** the skeleton boundary: a redirect thrown after Next.js has begun streaming becomes a client-side redirect behind HTTP 200. Pages repeat the check as a second layer. Keep this structure when adding routes (see `src/lib/auth/guards.ts`).

## Dependencies
Added: `lucide-react`, `motion`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@tanstack/react-table` (v8), `@radix-ui/react-{dropdown-menu,tooltip,dialog,alert-dialog,slot}`. Dev: `axe-core`.
Reused: `next`, `react`, `tailwindcss` 4, `recharts`, the existing fonts.


## Redesign: theme and interaction layer (current)

**How the dark theme works.** The design tokens (`--color-paper`, `--color-line`, slate and tint shades, shadows, chart colours) are remapped under `html.dark` in `src/app/globals.css`. Components are unchanged; only surfaces (`bg-white`), headings (`text-navy-900`) and primary actions (`bg-navy-900`) need explicit dark rules. Tint shades (`-100`) become translucent backgrounds, and where they are used as text they get their own light colours.

**Interaction (`src/components/fx/`).** `pointer-fx.tsx` is one document-level pointer listener throttled to animation frames. It drives the cursor glow, the card spotlight (`.spot`, applied by `Card`) and tilt (`data-tilt`, applied by `StatCard`). `command-palette.tsx` is a combobox dialog (`GET /api/v1/search` for institutions, scoped). `theme-toggle.tsx` and a pre-paint script in `layout.tsx` handle the theme. `counter.tsx` counts up visually while screen readers get the final number.

**Reference details, and the data behind each**

| Reference | Where | Data |
|---|---|---|
| Enrolment hero, gender bubbles, people pictograms | Command Centre | Enrolment by gender for the scoped institutions; change versus last year for the same institutions |
| Category spread made of people | Command Centre | Admission category mix |
| "Issues found", severity glow, counts by type | Alerts | Open alerts and conflicts in scope |
| "Issues found", data quality bar, tinted rows | Validation results | The submission's own counts |
| File-type tiles | Upload centre | Honest: CSV supported; Excel must be saved as CSV; others not supported |
| Privacy controls, data access log | Verifier dashboard; student profile | Built-in protections; every lookup of the student's records |
| Role matrix, masking rules, controls checklist | Super Admin overview | Generated from `permissions.ts`; checks run live (audit chain, encryption, consent, demo mode, signing key) |
| Pending tasks, recent exports | Reports | Scoped counts; the user's own export events from the audit log |

**Deliberately not copied:** a real India boundary map (the tile map avoids disputed boundaries and needs no external map data), mascot "AI" chatbots, an "offline sync" status, and XML/FTP/HTTPS upload tiles. The app does not do these, so they are not drawn.


## Current layout (supersedes the sidebar sections above)

The left sidebar was replaced by a floating top bar modelled on the user's aiopstool (Partnerly) design: logo orb, navigation pills (the current page has an outlined, glowing pill), accent swatches, theme switch, notifications, account menu and a gradient Search pill. Navigation uses short labels in the bar (for example "Overview" for Command centre) and full labels in the drawer and tooltips. The bar is shown from 1280px; below that a drawer opens from the menu button. Swatches sit in the bar from 1400px and in the account menu below that.

Accent colours are CSS variables (`--a1`, `--a2`, `--a3`, `--a-glow`) selected by `html[data-accent]`. Primary actions (`bg-navy-900`) use the accent gradient with dark text in both themes. Fonts: Inter for text and figures; Instrument Serif italic for the accent word in page titles (`.display-accent`).

**Not copied from the reference:** the bottom "Ask why…" assistant bar. APAAR Nexus has no AI assistant, so none is drawn; the Search pill opens real search (Ctrl K / ⌘K).

**Verified:** both themes have 0 WCAG A/AA violations over 39 page states; the top bar was measured to fit at 1280 and 1440px for three roles; `browser-ui.py` checks that swatches change the real button colour, that accent and theme survive a reload, that the chosen swatch is announced, and that Ctrl K search navigates.
