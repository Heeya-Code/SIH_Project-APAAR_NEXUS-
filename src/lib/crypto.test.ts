// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { encryptField, decryptField, keyedHash, stableStringify } from "./crypto";

// Keys are read lazily inside the functions, so setting them after import is safe.
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.HMAC_PEPPER = randomBytes(32).toString("base64");

test("encrypt/decrypt round trip, non-deterministic ciphertext", () => {
  const a = encryptField("Priya Sharma");
  const b = encryptField("Priya Sharma");
  assert.notEqual(a, b);
  assert.equal(decryptField(a), "Priya Sharma");
  assert.ok(!a.includes("Priya"));
});
test("tampered ciphertext is rejected (GCM authentication)", () => {
  const c = encryptField("secret");
  const [iv, tag, ct] = c.slice(3).split(".");
  const flipped = ct.slice(0, -2) + (ct.endsWith("AA") ? "BB" : "AA");
  assert.throws(() => decryptField(`v1:${iv}.${tag}.${flipped}`));
});
test("keyedHash is deterministic and domain separated", () => {
  assert.equal(keyedHash("apaar", "991234567890"), keyedHash("apaar", "991234567890"));
  assert.notEqual(keyedHash("apaar", "991234567890"), keyedHash("match", "991234567890"));
  assert.equal(keyedHash("apaar", "x").length, 64);
});
test("stableStringify ignores key order", () => {
  assert.equal(stableStringify({ b: 1, a: { d: 2, c: 3 } }), stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
});
