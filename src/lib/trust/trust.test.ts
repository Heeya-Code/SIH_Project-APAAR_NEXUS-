// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { bandOf, computeTrust, DEFAULT_WEIGHTS, loadWeights, type TrustMetrics } from "./score";

const clean: TrustMetrics = { records: 300, missingApaar: 0, apaarProvided: 300, apaarWellFormed: 300, duplicateRecords: 0, ordinary: 280, intake: 300, capBreaches: 0, firstSubmissionRejectRate: 0, submitted: true, daysLate: -8, openConflicts: 0, openHighAnomalies: 0 };

test("default weights sum to 100", () => assert.equal(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0), 100));
test("a clean institution scores 100 and is STRONG with no recommendations", () => {
  const r = computeTrust(clean); assert.ok(r.scored); if (!r.scored) return;
  assert.equal(r.overall, 100); assert.equal(r.band, "STRONG"); assert.ok(r.components.every((c) => c.recommendation === null && c.pointsLost === 0));
});
test("an unsubmitted year is not scored, with a reason, rather than scored zero", () => {
  const r = computeTrust({ ...clean, submitted: false }); assert.ok(!r.scored); if (!r.scored) assert.match(r.reason, /No accepted submission/);
});
test("intake overshoot lowers only the intake component, with the formula visible in the detail", () => {
  const r = computeTrust({ ...clean, ordinary: 345 }); assert.ok(r.scored); if (!r.scored) return; // 15% over -> 100*(1-0.15/0.25) = 40
  const intake = r.components.find((c) => c.key === "intake")!;
  assert.equal(intake.score, 40); assert.equal(intake.pointsLost, 12); assert.match(intake.detail, /15\.0% above intake/); assert.ok(intake.recommendation);
  assert.equal(r.overall, 88); assert.ok(r.components.filter((c) => c.key !== "intake").every((c) => c.score === 100));
});
test("supernumerary cap breaches cost 20 points each; the score never goes below 0", () => {
  const r = computeTrust({ ...clean, capBreaches: 2 }); assert.ok(r.scored); if (!r.scored) return;
  assert.equal(r.components.find((c) => c.key === "intake")!.score, 60);
  const worse = computeTrust({ ...clean, ordinary: 600, capBreaches: 3 }); assert.ok(worse.scored); if (worse.scored) assert.equal(worse.components.find((c) => c.key === "intake")!.score, 0);
});
test("missing and malformed IDs lower completeness and validity separately", () => {
  const r = computeTrust({ ...clean, missingApaar: 60, apaarProvided: 240, apaarWellFormed: 216 }); assert.ok(r.scored); if (!r.scored) return;
  assert.equal(r.components.find((c) => c.key === "completeness")!.score, 80); assert.equal(r.components.find((c) => c.key === "validity")!.score, 90);
});
test("timeliness: on time is 100, five points are lost per late day, floor 0", () => {
  const t = (d: number) => { const r = computeTrust({ ...clean, daysLate: d }); return r.scored ? r.components.find((c) => c.key === "timeliness")!.score : -1; };
  assert.deepEqual([t(-3), t(0), t(4), t(30)], [100, 100, 80, 0]);
});
test("repeated corrections (first-submission error rate) lower consistency", () => {
  const r = computeTrust({ ...clean, firstSubmissionRejectRate: 61 / 240 }); assert.ok(r.scored); if (r.scored) assert.equal(r.components.find((c) => c.key === "consistency")!.score, 0);
});
test("weights are configurable: the same metrics give a different overall under different weights", () => {
  const m = { ...clean, ordinary: 345 };
  const a = computeTrust(m), b = computeTrust(m, { ...DEFAULT_WEIGHTS, intake: 50, completeness: 0, validity: 5, duplicates: 15, consistency: 10, timeliness: 10, conflicts: 10 });
  assert.ok(a.scored && b.scored); if (a.scored && b.scored) assert.ok(b.overall < a.overall);
});
test("environment weights are validated and fall back safely", () => {
  assert.equal(loadWeights(undefined).source, "default");
  assert.equal(loadWeights('{"completeness":10,"validity":10,"duplicates":10,"intake":50,"consistency":10,"timeliness":5,"conflicts":5}').source, "environment");
  const bad = loadWeights('{"completeness":50}'); assert.equal(bad.source, "default"); assert.ok(bad.warning);
  assert.ok(loadWeights("not json").warning); assert.ok(loadWeights('{"completeness":20,"validity":20,"duplicates":20,"intake":20,"consistency":20,"timeliness":20,"conflicts":20}').warning, "weights summing to 140 are rejected");
});
test("bands are not accreditation labels and cover the range", () => assert.deepEqual([100, 85, 84.9, 70, 69.9, 50, 49.9, 0].map(bandOf), ["STRONG", "STRONG", "GOOD", "GOOD", "WATCH", "WATCH", "AT_RISK", "AT_RISK"]));
