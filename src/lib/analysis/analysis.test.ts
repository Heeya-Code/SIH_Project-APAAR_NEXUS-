// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import test from "node:test";
import assert from "node:assert/strict";
import { isolationForest, robustZ } from "./iforest";
import { ruleAlerts, type InstYear } from "./rules";

const base = (o: Partial<InstYear> = {}): InstYear => ({ institutionId: "i", institutionName: "I", ay: "2026-27", prevAy: "2025-26", admissions: 300, prevAdmissions: 295, ordinary: 280, intake: 300, records: 300, missing: 6,
  byCategory: { GEN: 126, OBC: 76, SC: 42, ST: 21, EWS: 29, NRI: 3, OCI: 0, FN: 1, TFWS: 8 }, prevByCategory: { GEN: 126, OBC: 76, SC: 42, ST: 21, EWS: 29, NRI: 3, OCI: 0, FN: 1, TFWS: 8 }, programmes: [{ name: "B.E. CSE", intake: 150, ordinary: 140 }, { name: "B.E. ME", intake: 150, ordinary: 140 }], ...o });
const kinds = (y: InstYear) => ruleAlerts(y).map((a) => a.kind);

test("a normal institution-year raises no alerts", () => assert.deepEqual(kinds(base()), []));
test("REGRESSION: a surplus in one programme is NOT hidden by a shortfall in another (intake is approved per programme)", () => {
  const y = base({ ordinary: 280, intake: 300, programmes: [{ name: "B.E. ME", intake: 60, ordinary: 84 }, { name: "B.E. CSE", intake: 240, ordinary: 196 }] });
  assert.equal(y.ordinary, 280); assert.ok(y.ordinary < y.intake, "the institution-level total is under intake");
  const a = ruleAlerts(y).find((x) => x.kind === "INTAKE_OVERSHOOT")!; assert.ok(a, "but the alert still fires"); assert.match(a.explanation.headline, /24 students above approved intake in 1 programme/); assert.equal(a.severity, "HIGH");
});
test("intake overshoot is reported with severity by size and explains the comparison", () => {
  const prog = (a: number, b: number) => [{ name: "B.E. CSE", intake: 150, ordinary: a }, { name: "B.E. ME", intake: 150, ordinary: b }];
  const a = ruleAlerts(base({ programmes: prog(150, 172) }))[0]; assert.equal(a.kind, "INTAKE_OVERSHOOT"); assert.equal(a.severity, "MEDIUM");
  assert.match(a.explanation.headline, /22 students above approved intake in 1 programme/); assert.match(a.explanation.observed, /B\.E\. ME: 172 admitted/); assert.match(a.explanation.comparedWith, /150 approved \(114\.7% utilisation\)/);
  assert.equal(ruleAlerts(base({ programmes: prog(150, 200) }))[0].severity, "HIGH"); assert.equal(ruleAlerts(base({ programmes: prog(150, 152) }))[0].severity, "LOW");
  assert.deepEqual(kinds(base({ programmes: prog(120, 150) })), [], "exactly at intake is compliant");
});
test("an NRI spike is flagged with the previous-year comparison; steady NRI within the allowance is not", () => {
  const spike = ruleAlerts(base({ byCategory: { ...base().byCategory, NRI: 71 }, prevByCategory: { ...base().byCategory, NRI: 9 } })).find((a) => a.kind === "SUPERNUMERARY_SPIKE")!;
  assert.equal(spike.severity, "HIGH"); assert.match(spike.explanation.headline, /NRI admissions rose from 9 to 71/); assert.match(spike.explanation.why, /at least 3 times/);
  assert.deepEqual(kinds(base({ byCategory: { ...base().byCategory, NRI: 21 }, prevByCategory: { ...base().byCategory, NRI: 21 } })), [], "Deccan-like steady NRI is never flagged");
});
test("OCI and FN spikes are detected the same way", () => {
  assert.ok(kinds(base({ byCategory: { ...base().byCategory, OCI: 14 }, prevByCategory: { ...base().byCategory, OCI: 2 } })).includes("SUPERNUMERARY_SPIKE"));
  assert.ok(kinds(base({ byCategory: { ...base().byCategory, FN: 20 }, prevByCategory: { ...base().byCategory, FN: 4 } })).includes("SUPERNUMERARY_SPIKE"));
});
test("a sudden enrolment spike needs a meaningful baseline", () => {
  assert.ok(kinds(base({ admissions: 560, prevAdmissions: 298 })).includes("ENROLMENT_SPIKE"));
  assert.ok(!kinds(base({ admissions: 40, prevAdmissions: 10 })).includes("ENROLMENT_SPIKE"), "tiny baselines are ignored");
});
test("an unusual category share is flagged (EWS 55%)", () => {
  const a = ruleAlerts(base({ byCategory: { GEN: 40, OBC: 25, SC: 15, ST: 8, EWS: 190, NRI: 2, OCI: 0, FN: 0, TFWS: 3 } })).find((x) => x.kind === "CATEGORY_SKEW")!;
  assert.match(a.explanation.headline, /EWS is 6\d%/); assert.equal(a.severity, "HIGH");
});
test("many missing IDs are flagged; every alert carries a caution that it is not proof", () => {
  const all = ruleAlerts(base({ missing: 110, ordinary: 345 }));
  assert.ok(all.some((a) => a.kind === "MISSING_ID_RATE")); assert.ok(all.every((a) => /not proof of wrongdoing/.test(a.explanation.caution)));
});
test("Isolation Forest: clear outliers get the highest scores, and it is deterministic for a seed", () => {
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const normal = Array.from({ length: 80 }, () => [0.05 + rnd() * 0.1, 0.9 + rnd() * 0.08, 0.01 + rnd() * 0.02, 0.1 + rnd() * 0.02]);
  const outliers = [[0.9, 1.2, 0.01, 0.1], [0.05, 0.9, 0.24, 0.1], [0.05, 0.95, 0.02, 0.55]];
  const data = [...normal, ...outliers], s = isolationForest(data, { seed: 3 });
  const top = s.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map((x) => x[1]).sort();
  assert.deepEqual(top, [80, 81, 82]); assert.ok(s[80] > 0.6 && s[0] < 0.55);
  assert.deepEqual(isolationForest(data, { seed: 3 }), s); assert.notDeepEqual(isolationForest(data, { seed: 4 }), s);
});
test("robust z-scores explain which feature is far from typical", () => {
  const data = [[1, 10], [1.1, 10.2], [0.9, 9.9], [1.05, 10.1], [5, 10]];
  const z = robustZ(data).z([5, 10]); assert.ok(z[0] > 5 && Math.abs(z[1]) < 1);
});

import { abbreviatedNameMatch, nameSimilarity } from "./names";
test("name matching: spelling variants and dropped or abbreviated middle names are similar, different people are not", () => {
  assert.ok(nameSimilarity("Aarav Suresh Patil", "Aarav Suresh Paatil") >= 0.9);
  assert.ok(abbreviatedNameMatch("Aarav Suresh Patil", "Aarav Patil")); assert.ok(abbreviatedNameMatch("Aarav Suresh Patil", "Aarav S. Patil")); assert.ok(abbreviatedNameMatch("Aarav S Patil", "Aarav Suresh Patil"));
  assert.ok(!abbreviatedNameMatch("Aarav Suresh Patil", "Aarav Mahesh Patil"), "a different father's name is a different person");
  assert.ok(!abbreviatedNameMatch("Aarav Suresh Patil", "Rohan Suresh Patil")); assert.ok(!abbreviatedNameMatch("Aarav Patil", "Aarav Patel"));
  assert.ok(nameSimilarity("Aarav Suresh Patil", "Divya Ramesh Shah") < 0.5);
});
