# Limitations and honest status

- **No real APAAR integration.** The registry is simulated (IDs beginning 99 are "known"). Authoritative verification needs authorised access. The ID pattern and all compliance thresholds are unconfirmed, illustrative defaults.
- **Synthetic data only.** 16 fictional institutions and 21,705 students (up to 100 more while the Demo A upload is in place; `npm run demo:reset` removes them).
- **Isolation Forest** is a screening aid. On 75 synthetic institution-years it adds little beyond the rules, and persistent outliers are deliberately suppressed. It cannot prove anything.
- **Corrections** are made by re-uploading a corrected file; editing a held row inside the app is not built.
- **Camera scanning** uses the browser camera API and is untested in automation (no camera); decoding a QR picture is tested end to end.
- **Trust Score** constants are illustrative and need agreement with AICTE.
- **Not built:** an AI assistant (the reference design has one; this app does not, so none is shown), React Hook Form (Zod and server actions cover the forms), email delivery for password reset, an in-app editor for compliance rules, webhooks (the adapter interface is ready for them).
- `ConsentRecord` (Phase 1) is superseded by `ConsentRequest` and no longer used; it is kept so no table was dropped.
- Not yet run on a real deployment; `prisma migrate deploy` was verified on your PostgreSQL 18 only for the earlier migrations.
- **Check results are produced on GET** (so a scanned QR link opens directly). A browser prefetch of such a link could record an extra lookup in the verifier's history.
- Regional officers see the names of the other institution in a conflict that involves one of their institutions, even if it is outside their region. No student data is shown.
- PDF reports use a standard font, so characters outside basic Latin print as "?".
- The simulated registry treats IDs starting with 99 as known; any other well-formed ID is reported "not found in the simulated registry" and flagged for review rather than rejected.
- Hashes use a pepper in the environment; key rotation is not implemented.
