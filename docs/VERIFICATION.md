# APAAR verification adapter

Three separate identity checks are never conflated:

| Tier | Question | Status |
|---|---|---|
| 1 Structural | Is the ID well-formed? | Working (`src/lib/apaar/structure.ts`, configurable pattern) |
| 2 Internal | Is it duplicated inside this repository? | Hashes and seeded data ready; engine in a later phase |
| 3 Authoritative | Does it exist and belong to this person? | **Adapter ready; only a MOCK provider exists** |

**The mock provider is not connected to APAAR, ABC, DigiLocker or any government system.** It answers from this
prototype's synthetic records, labels every response `mode: "MOCK"`, and always returns `authoritative: false`.
Only an adapter whose `info.mode` is `LIVE` can produce `authoritative: true`, and the service never writes
`Student.authoritativeVerified` (no live provider exists).

## Files (`src/lib/verification/`)
- `types.ts`: statuses (VERIFIED, INVALID, PENDING, UNAVAILABLE), reason codes, request and response shapes.
- `adapter.ts`: the `VerificationAdapter` interface a real provider implements.
- `execute.ts`: structural pre-check (malformed IDs never reach a provider), 5 s timeout with abort signal, error mapping.
- `mock-provider.ts`: the mock, with an injectable registry; reserved test IDs.
- `service.ts`: provider selection (`APAAR_VERIFICATION_PROVIDER`, default `mock`), audit logging.

## Reserved mock test IDs
`999999999001` PENDING, `999999999002` UNAVAILABLE (provider error), `999999999003` UNAVAILABLE (timeout after 5 s).

## Connecting a real provider later
1. Obtain authorised API access and credentials from the competent authority.
2. Implement `VerificationAdapter` with `info.mode = "LIVE"`; throw `VerificationProviderError` on failure and honour `signal`.
3. Register it in `selectProvider()` under a new `APAAR_VERIFICATION_PROVIDER` value; keep credentials in environment variables.
4. Decide, with legal and privacy review, whether a LIVE VERIFIED result may set `authoritativeVerified`, and add that write in `service.ts` only for LIVE providers.
