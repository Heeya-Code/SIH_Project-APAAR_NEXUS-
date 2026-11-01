# Architecture

```
Browser (React 19, Tailwind 4, Recharts, TanStack Table, Motion)
   │  pages (server components) and a few client islands
Next.js 16 App Router
   ├─ (portal)/…           role pages; each protected route has layout.tsx (guard) ABOVE loading.tsx
   ├─ api/v1/…             REST: apiRoute / apiGet wrapper = auth → permission → rate limit → zod → handler → audit
   └─ src/lib/
       ├─ auth/            sessions (DB-backed), permissions.ts (the only place roles are defined), guards
       ├─ submissions/     spec.ts (CSV contract) · parse.ts · validate.ts (five checks, pure) · service.ts (DB pipeline)
       ├─ analysis/        rules.ts · iforest.ts · names.ts · service.ts (conflicts, anomalies) · review.ts
       ├─ trust/           score.ts (pure formula) · service.ts (metric loader)
       ├─ consent/         service.ts (request → decide → sign → check → revoke)
       ├─ credentials/     sign.ts (Ed25519, QR) · claims.ts (selective disclosure)
       ├─ queries/         scoped reads (institutionScope applied once)
       └─ verification/    adapter interface + MOCK provider (never authoritative)
PostgreSQL (Prisma 7): 26 tables, a PII-free analytics view, append-only audit log (trigger)
```

## Design rules that matter

1. **Pure cores, thin shells.** The validation engine, Trust Score, anomaly rules, Isolation Forest, signing and audit canonicalisation have no database or framework imports, so each is unit tested directly.
2. **Scope is applied once.** Every read goes through `institutionScope(actor)`; a regional officer cannot name an out-of-region institution because the query never returns it.
3. **Intake is judged per programme** (`queries/intake.ts`). One definition is used by the ledger, Command Centre, alerts and Trust Score so screens never disagree.
4. **Idempotency.** A row key (keyed hash of institution + student reference + year) means re-uploading an unchanged record is recognised and skipped; a changed record with the same reference is rejected, never silently overwritten.
5. **Consent is its own table** (`ConsentRequest`); logging in is never consent. A verifier receives only claims copied into the signed record from the fields the student approved.
6. **Analysis is idempotent** and never overwrites a human review decision.

## Migrations
1. `…01_init` (24 tables) 2. `…02_audit_immutability_and_analytics_view` 3. `…03_phase2_consent_submissions_codes` (additive: `ConsentRequest`, `ConsentStatus`, `Student.verifyCode`, submission and row columns). No existing table, column or row is dropped or rewritten.

## Dependencies added in this phase
`papaparse` (CSV parsing) · `qrcode` (QR generation) · `jsqr` (QR decoding in the browser) · `pdf-lib` (PDF reports) · `sonner` (toasts).
