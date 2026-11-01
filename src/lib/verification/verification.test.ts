// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { executeVerification } from "./execute";
import { createMockProvider, MOCK_TEST_IDS, type MockRegistry } from "./mock-provider";
import { VerificationProviderError, type ProviderResult } from "./types";
import type { VerificationAdapter } from "./adapter";

const registry: MockRegistry = {
  async find(id) { return id === "991234567890" ? [{ fullName: "Priya Suresh Sharma", dateOfBirth: "2006-03-14" }] : []; },
};
const mock = createMockProvider(registry);
const req = (apaarId: string, extra: Record<string, string> = {}) => ({ requestId: "r1", purpose: "ADMISSION_CHECK" as const, apaarId, ...extra });

test("known ID without details: VERIFIED", async () => {
  const r = await executeVerification(mock, req("991234567890"));
  assert.equal(r.status, "VERIFIED"); assert.equal(r.reasonCode, "MATCH");
});
test("ID with matching name (case/spacing insensitive) and DOB: VERIFIED with matched flags", async () => {
  const r = await executeVerification(mock, req("9912-3456-7890", { fullName: "priya  SURESH sharma", dateOfBirth: "2006-03-14" }));
  assert.equal(r.status, "VERIFIED"); assert.deepEqual(r.matched, { name: true, dateOfBirth: true });
});
test("wrong DOB: INVALID / IDENTITY_MISMATCH and says which field failed", async () => {
  const r = await executeVerification(mock, req("991234567890", { fullName: "Priya Suresh Sharma", dateOfBirth: "2006-03-15" }));
  assert.equal(r.status, "INVALID"); assert.equal(r.reasonCode, "IDENTITY_MISMATCH"); assert.deepEqual(r.matched, { name: true, dateOfBirth: false });
});
test("unknown well-formed ID: INVALID / NOT_FOUND", async () => {
  const r = await executeVerification(mock, req("991111111111"));
  assert.equal(r.status, "INVALID"); assert.equal(r.reasonCode, "NOT_FOUND");
});
test("malformed ID is rejected locally and the provider is never called", async () => {
  let called = false;
  const spy: VerificationAdapter = { info: mock.info, verify: async () => { called = true; return { status: "VERIFIED", reasonCode: "MATCH", message: "" }; } };
  const r = await executeVerification(spy, req("12345"));
  assert.equal(r.status, "INVALID"); assert.equal(r.reasonCode, "STRUCTURE_INVALID"); assert.equal(called, false);
  assert.match(r.message, /not contacted/i);
});
test("reserved test ID returns PENDING", async () => {
  const r = await executeVerification(mock, req(MOCK_TEST_IDS.PENDING));
  assert.equal(r.status, "PENDING"); assert.equal(r.reasonCode, "PROCESSING");
});
test("provider failure maps to UNAVAILABLE / PROVIDER_ERROR without leaking the internal message", async () => {
  const r = await executeVerification(mock, req(MOCK_TEST_IDS.PROVIDER_ERROR));
  assert.equal(r.status, "UNAVAILABLE"); assert.equal(r.reasonCode, "PROVIDER_ERROR"); assert.ok(!r.message.includes("simulated failure"));
});
test("a slow provider times out and receives an abort signal", async () => {
  let aborted = false;
  const slow: VerificationAdapter = { info: mock.info, verify: (_r, signal) => new Promise<ProviderResult>(() => { signal.addEventListener("abort", () => { aborted = true; }); }) };
  const r = await executeVerification(slow, req("991234567890"), { timeoutMs: 40 });
  assert.equal(r.status, "UNAVAILABLE"); assert.equal(r.reasonCode, "PROVIDER_TIMEOUT"); assert.equal(aborted, true);
});
test("unexpected exceptions are contained, not thrown", async () => {
  const broken: VerificationAdapter = { info: mock.info, verify: async () => { throw new TypeError("boom"); } };
  const r = await executeVerification(broken, req("991234567890"));
  assert.equal(r.reasonCode, "PROVIDER_ERROR");
});
test("the mock is NEVER authoritative; only a LIVE provider can be", async () => {
  assert.equal((await executeVerification(mock, req("991234567890"))).authoritative, false);
  const live: VerificationAdapter = { info: { id: "x", name: "Authorised provider", mode: "LIVE" }, verify: async () => ({ status: "VERIFIED", reasonCode: "MATCH", message: "ok" }) };
  assert.equal((await executeVerification(live, req("991234567890"))).authoritative, true);
});
test("responses never contain the submitted APAAR ID", async () => {
  for (const id of ["991234567890", "991111111111", MOCK_TEST_IDS.PENDING, "12345"]) {
    assert.ok(!JSON.stringify(await executeVerification(mock, req(id))).includes(id));
  }
});
test("provider errors carry a retryable flag", () => assert.equal(new VerificationProviderError("x", false).retryable, false));
