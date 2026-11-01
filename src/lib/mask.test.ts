// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { maskApaar, maskName, redactIdentifiers } from "./mask";

test("maskApaar shows only last four digits", () => {
  assert.equal(maskApaar("991234567890"), "•••• •••• 7890");
  assert.equal(maskApaar(null), "Not provided");
});
test("maskName never reveals more than the initial", () => {
  const m = maskName("Priya Sharma");
  assert.ok(!m.includes("riya") && !m.includes("harma"));
  assert.ok(m.startsWith("P") && m.includes(" S"));
});
test("redactIdentifiers removes APAAR-like runs", () => {
  assert.equal(redactIdentifiers("id 9912 3456 7890 failed"), "id [REDACTED-ID] failed");
  assert.equal(redactIdentifiers("991234567890"), "[REDACTED-ID]");
});
