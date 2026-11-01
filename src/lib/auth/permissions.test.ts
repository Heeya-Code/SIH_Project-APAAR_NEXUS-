// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { can, institutionScope, ForbiddenError, ROLE_PERMISSIONS, type Actor } from "./permissions";

const base = { id: "u", institutionId: null, region: null, studentId: null };
const actor = (o: Partial<Actor> & Pick<Actor, "role">): Actor => ({ ...base, ...o });

test("national roles see all institutions; regional officer is region-scoped", () => {
  assert.deepEqual(institutionScope(actor({ role: "AICTE_ADMIN" })), {});
  assert.deepEqual(institutionScope(actor({ role: "SUPER_ADMIN" })), {});
  assert.deepEqual(institutionScope(actor({ role: "REGIONAL_OFFICER", region: "WEST" })), { region: "WEST" });
});
test("institution roles are pinned to their own institution", () => {
  assert.deepEqual(institutionScope(actor({ role: "INSTITUTION_ADMIN", institutionId: "i1" })), { id: "i1" });
  assert.deepEqual(institutionScope(actor({ role: "DATA_ENTRY_OPERATOR", institutionId: "i1" })), { id: "i1" });
});
test("scope fails closed when linkage is missing", () => {
  assert.throws(() => institutionScope(actor({ role: "REGIONAL_OFFICER" })), ForbiddenError);
  assert.throws(() => institutionScope(actor({ role: "INSTITUTION_ADMIN" })), ForbiddenError);
});
test("students and verifiers have no institution-level scope", () => {
  assert.throws(() => institutionScope(actor({ role: "STUDENT", studentId: "s" })), ForbiddenError);
  assert.throws(() => institutionScope(actor({ role: "VERIFIER" })), ForbiddenError);
});
test("least privilege: sensitive permissions are narrowly held", () => {
  const holders = (p: Parameters<typeof can>[1]) => (Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]).filter((r) => can(r, p));
  assert.deepEqual(holders("students:reveal-apaar"), ["INSTITUTION_ADMIN"]);
  assert.deepEqual(holders("users:manage"), ["SUPER_ADMIN"]);
  assert.ok(!can("AICTE_ADMIN", "students:view"), "national roles never get student-level lists");
  assert.ok(!can("DATA_ENTRY_OPERATOR", "students:reveal-apaar"));
});
