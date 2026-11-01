// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { checkApaarStructure, normaliseApaar } from "./structure";

test("well-formed 12-digit ID", () => {
  const r = checkApaarStructure("991234567890");
  assert.equal(r.format, "WELL_FORMED");
  assert.equal(r.wasNormalised, false);
});
test("separators are normalised, not rejected", () => {
  const r = checkApaarStructure(" 9912-3456 7890 ");
  assert.equal(r.format, "WELL_FORMED");
  assert.equal(r.normalised, "991234567890");
  assert.equal(r.wasNormalised, true);
});
test("Devanagari digits normalise to ASCII", () => {
  assert.equal(normaliseApaar("९९१२३४५६७८९०"), "991234567890");
});
test("missing and placeholder values are MISSING", () => {
  for (const v of [null, undefined, "", "  ", "NA", "n/a", "Pending"]) assert.equal(checkApaarStructure(v).format, "MISSING", String(v));
});
test("wrong length or letters are INVALID_FORMAT with an actionable hint", () => {
  for (const v of ["99123456789", "9912345678901", "99AB34567890"]) {
    const r = checkApaarStructure(v);
    assert.equal(r.format, "INVALID_FORMAT", v);
    assert.ok(r.reason && r.fixHint);
  }
});
test("pattern is configurable via env", () => {
  process.env.APAAR_ID_PATTERN = "^[0-9]{10}$";
  assert.equal(checkApaarStructure("1234567890").format, "WELL_FORMED");
  assert.equal(checkApaarStructure("991234567890").format, "INVALID_FORMAT");
  delete process.env.APAAR_ID_PATTERN;
});
