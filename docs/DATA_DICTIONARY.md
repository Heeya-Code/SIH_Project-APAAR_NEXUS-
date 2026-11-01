# Data dictionary (all data is synthetic)

## Upload CSV (`demo-data/*.csv`, template at /api/v1/templates/students)
| Column | Req | Meaning | Rules |
|---|---|---|---|
| student_ref | yes | Institution's own roll number | unique per institution and year |
| full_name | yes | Name as in admission records | stored encrypted |
| date_of_birth | yes | YYYY-MM-DD or DD/MM/YYYY | real date; age at admission 14 to 45 or flagged |
| gender | yes | MALE, FEMALE, OTHER (M/F/O) | statistics only |
| apaar_id | yes | 12-digit ID (separators allowed) | format check, simulated registry, keyed hash for matching |
| programme_code | yes | One of the institution's codes | must exist |
| admission_year | yes | Calendar year | must agree with academic_year |
| academic_year | yes | e.g. 2026-27 | must equal the year being uploaded |
| category_code | yes | GEN OBC SC ST EWS · NRI OCI FN TFWS | the last four are supernumerary |
| status | no | ENROLLED (default), WITHDRAWN, GRADUATED | withdrawn rows never clash or count |

## Validation outcomes
`VALID` · `WARNING` (note only) · `REQUIRES_REVIEW` (accepted, flagged for AICTE) · `REJECTED` (held until corrected). Row disposition: `PENDING`, `ACCEPTED`, `HELD`, `SKIPPED` (already received).
Issue categories: `DUPLICATE`, `APAAR`, `INTAKE`, `DATA`, `CROSS_INSTITUTION`.

## Key tables
| Table | Purpose |
|---|---|
| Student / StudentIdentity | Non-identifying attributes and keyed hashes / encrypted name, DOB, APAAR ID |
| Enrolment | One per student per year; category, programme, status, submission |
| DataSubmission / StagedRecord / ValidationIssue | An upload, its rows (encrypted payload) and every reason a row or file was flagged |
| ApprovedIntake / ComplianceRule | Seats per programme per year; illustrative thresholds with provenance |
| DuplicateAlert | Cross-institution or within-institution conflict, with PII-free evidence and a review status |
| AnomalyAlert | Rule or model alert with a structured explanation and review status |
| ConsentRequest | The Student Consent Log: who, why, fields requested, fields approved, decision, expiry, withdrawal |
| DigitalCredential | The signed verification record (payload holds only approved claims) |
| VerificationRequest | Every lookup a verifier made, with its result |
| AuditLog | Hash-chained, append-only |

## Verification states
Structural (working) · Internal duplicate (working) · **Authoritative (not available; mock only)**. A well-formed ID is never described as a verified identity.
