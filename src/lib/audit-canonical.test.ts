// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { GENESIS, recordDigest, sanitise, type AuditFields } from "./audit-canonical";

const rec = (metadata: unknown): AuditFields => ({ createdAt: new Date("2026-10-31T10:00:00.000Z"), actorUserId: "u1", actorRole: "VERIFIER", action: "VERIFICATION_CHECKED", entityType: null, entityId: null, institutionId: null, outcome: "FAILURE", metadata, ipHash: null });
const roundTrip = (v: unknown) => JSON.parse(JSON.stringify(v)); // what the database hands back

test("REGRESSION: a metadata key set to undefined must not change the hash after a database round trip", () => {
  const written = sanitise({ result: "NOT_FOUND", method: "QR_SCAN", consent: undefined });
  assert.equal(recordDigest(GENESIS, rec(written)), recordDigest(GENESIS, rec(roundTrip(written))));
  assert.ok(!("consent" in (written as object)));
});
test("nested undefined, nulls and arrays survive the round trip with identical hashes", () => {
  const written = sanitise({ a: { b: undefined, c: null, d: [1, undefined === undefined ? "x" : "y"] }, n: 0, s: "" });
  assert.equal(recordDigest("p", rec(written)), recordDigest("p", rec(roundTrip(written))));
});
test("identifiers are redacted before hashing, so they can never reach the log", () => {
  assert.deepEqual(sanitise({ note: "id 9912 3456 7890 failed" }), { note: "id [REDACTED-ID] failed" });
});
test("any change to a record changes its digest, and the previous hash is chained in", () => {
  const base = recordDigest(GENESIS, rec({ x: 1 }));
  assert.notEqual(base, recordDigest(GENESIS, rec({ x: 2 })));
  assert.notEqual(base, recordDigest("f".repeat(64), rec({ x: 1 })));
  assert.notEqual(base, recordDigest(GENESIS, { ...rec({ x: 1 }), outcome: "SUCCESS" }));
});
