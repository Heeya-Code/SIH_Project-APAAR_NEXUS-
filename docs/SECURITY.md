# Security and privacy

Designed with the principles of India's Digital Personal Data Protection Act, 2023 in mind. This is a design aim for a prototype, **not a legal compliance claim**.

| Principle | How it is applied |
|---|---|
| Data minimisation | Upload asks only for fields the checks need; reports hold no student-level data; the verifier gets only approved fields |
| Purpose limitation | A consent request must state a purpose from a fixed list; the purpose is stored and shown |
| Explicit consent | Separate request, student decision, approved subset, validity period; login is never consent; withdrawal is immediate |
| Encryption | Name, date of birth and APAAR ID encrypted with AES-256-GCM; staged upload rows encrypted |
| Protected matching | Keyed HMAC-SHA256 of APAAR ID, name+DOB and DOB; conflict evidence contains institutions and match flags only |
| Access control | Seven roles in `permissions.ts`; scoped queries; guards above loading boundaries so denials are real redirects |
| Signed records | Ed25519 over canonical JSON; tamper, expiry, withdrawal and wrong-requester each detected; QR holds only an opaque code |
| Audit | Append-only, SHA-256 hash chain; metadata scrubbed of identifiers and canonicalised so verification is reproducible (a regression test covers an earlier bug) |
| Abuse controls | Rate limits on login, upload, consent, lookups, reset; request size limits; CSV formula-injection guard on exports; strict zod schemas |

**Residual risks:** in-memory rate limiting is per process; the signing key derives from the encryption key unless `CREDENTIAL_SIGNING_SEED` is set; QR check results are produced on GET so a link prefetch could record a lookup. See LIMITATIONS.md.
