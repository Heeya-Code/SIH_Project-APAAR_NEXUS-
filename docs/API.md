# API conventions

Endpoints are added **alongside the features that need them**. Server actions (login, logout, APAAR reveal,
user administration, audit verification) are unchanged and remain the mechanism for in-app form actions.

Every API route is wrapped by `apiRoute()` (`src/lib/api/route.ts`), which applies, in order:

1. **CSRF defence**: cross-origin `Origin` headers are refused (403 `CSRF_REJECTED`); bodies must be `application/json` (415).
2. **Authentication**: session cookie required (401 `UNAUTHENTICATED`).
3. **Permission**: checked against `src/lib/auth/permissions.ts` (403 `FORBIDDEN`, audited as `ACCESS_DENIED` with `via: "api"`).
4. **Rate limit** (optional per route): 429 `RATE_LIMITED` with `Retry-After` (audited).
5. **Body size limit** (16 KB, 413) and JSON parsing (400 `INVALID_JSON`).
6. **Validation** with a strict zod schema (422 `VALIDATION_FAILED`). Errors list field paths and messages only and never echo submitted values.
7. **Error containment**: unexpected errors return 500 `INTERNAL` with a request ID; messages are never logged (they may contain PII).

## Response envelope

```json
{ "ok": true,  "data": { },  "meta": { "requestId": "uuid" } }
{ "ok": false, "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [ { "field": "dateOfBirth", "message": "..." } ] }, "meta": { "requestId": "uuid" } }
```
The same `requestId` is returned in the `x-request-id` header. Responses are `cache-control: no-store`.

## Endpoints

### `POST /api/v1/verification/apaar`
Permission `verification:apaar` (Institution Admin, Data Entry Operator). Limit 30 requests per user per 10 minutes.

Request: `{ "apaarId": "string", "fullName"?: "string", "dateOfBirth"?: "YYYY-MM-DD" }` (unknown fields rejected).

Response `data`:
```json
{ "requestId": "...", "status": "VERIFIED|INVALID|PENDING|UNAVAILABLE",
  "reasonCode": "MATCH|STRUCTURE_INVALID|NOT_FOUND|IDENTITY_MISMATCH|PROCESSING|PROVIDER_TIMEOUT|PROVIDER_ERROR|NO_PROVIDER_CONFIGURED",
  "message": "...", "matched": { "name": true, "dateOfBirth": false },
  "provider": { "id": "mock-registry", "name": "...", "mode": "MOCK" },
  "authoritative": false, "checkedAt": "ISO-8601" }
```
The submitted APAAR ID is never returned, stored or logged. The audit entry holds a 12-character keyed-hash reference only.

## EnrolTrust endpoints (all under /api/v1, same envelope, errors and audit as above)

| Method and path | Permission | What it does |
|---|---|---|
| POST /submissions | submissions:create | Validate an uploaded CSV `{academicYear, fileName, csv}`; stores nothing as an enrolment |
| POST /submissions/submit | submissions:create | Store the passing rows; held rows stay; safe to repeat |
| GET /submissions | submissions:view | Upload history |
| GET /submissions/{id}?category=&outcome=&page= | submissions:view | Validation results with row-level reasons and fixes |
| GET /submissions/{id}/report | submissions:view | Correction report CSV (IDs masked) |
| GET /templates/students[?sample=1] | submissions:create | Blank or sample CSV |
| POST /consent/requests | consent:request | Verifier asks a student `{studentCode, purpose, fields[]}` |
| POST /consent/decision | consent:decide | Student approves a subset or declines |
| POST /consent/revoke | consent:decide | Student withdraws; the code stops working |
| POST /verification/check | verification:check | Resolve a code or scanned QR; returns only approved claims |
| POST /alerts/review | alerts:review | Record a decision on an anomaly or conflict (scoped by region) |
| POST /analysis/refresh | alerts:review | Re-run conflict and anomaly analysis (idempotent) |
| GET /analytics/seat-ledger?ay=&region= | national:view | Programme-level seats |
| GET /reports/seat-ledger, /reports/trust, /reports/institution/{id} | reports:export | CSV and PDF with data provenance |
| POST /operators | operators:manage | Create a data operator; temporary password shown once |
| POST /notifications/read | any signed-in user | Mark own notifications read |
| POST /demo/reset | operators:manage + DEMO_MODE | Remove the demo upload |

## Adding an endpoint
Create `src/app/api/v1/<feature>/route.ts`, define a strict zod schema, and export `POST = apiRoute({ permission, schema, rateLimit?, handler })`.
Add a permission to `permissions.ts` if none fits, and extend `scripts/verify-closeout.ts`.
