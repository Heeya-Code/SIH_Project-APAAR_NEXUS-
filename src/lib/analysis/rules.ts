// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Rule-based anomaly checks. Each alert says what was seen, what it was compared with, and why that is unusual.
// "Unusual" is not "wrong": alerts ask a human to look. Thresholds come from the ComplianceRule table.
export type Severity = "LOW" | "MEDIUM" | "HIGH";
export type InstYear = {
  institutionId: string; institutionName: string; ay: string; prevAy: string | null;
  admissions: number; prevAdmissions: number | null; ordinary: number; intake: number; records: number; missing: number;
  byCategory: Record<string, number>; prevByCategory: Record<string, number> | null;
  /** approved intake and ordinary admissions PER PROGRAMME (intake is approved per programme) */
  programmes: { name: string; intake: number; ordinary: number }[];
};
export type RuleConfig = { maxGrowthPercent: number; minBaseline: number; maxShareByCategory: Record<string, number>; nriCapPercent: number; ociFnCapPercent: number; spikeFactor: number; minSpikeCount: number; missingRateThreshold: number };
export const DEFAULT_RULES: RuleConfig = { maxGrowthPercent: 40, minBaseline: 50, maxShareByCategory: { GEN: 0.8, OBC: 0.6, SC: 0.4, ST: 0.3, EWS: 0.25 }, nriCapPercent: 15, ociFnCapPercent: 15, spikeFactor: 3, minSpikeCount: 8, missingRateThreshold: 0.2 };

export type RuleAlert = { institutionId: string; ay: string; kind: string; variant?: string; severity: Severity; score: number; explanation: { rule: string; headline: string; observed: string; comparedWith: string; why: string; caution: string } };
const CAUTION = "This is an unusual pattern that needs a human look, not proof of wrongdoing. There may be a legitimate explanation.";
const p = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;

export function ruleAlerts(y: InstYear, cfg: RuleConfig = DEFAULT_RULES): RuleAlert[] {
  const out: RuleAlert[] = [];
  const add = (kind: string, severity: Severity, score: number, e: Omit<RuleAlert["explanation"], "caution">, variant?: string) => out.push({ institutionId: y.institutionId, ay: y.ay, kind, variant, severity, score, explanation: { ...e, caution: CAUTION } });

  const over = y.programmes.filter((x) => x.ordinary > x.intake && x.intake > 0);
  if (over.length) {
    const seats = over.reduce((t, x) => t + (x.ordinary - x.intake), 0), worst = Math.max(...over.map((x) => (x.ordinary - x.intake) / x.intake));
    add("INTAKE_OVERSHOOT", worst > 0.15 ? "HIGH" : worst > 0.05 ? "MEDIUM" : "LOW", worst, { rule: "Ordinary admissions above approved intake", headline: `${seats} students above approved intake in ${over.length} programme${over.length === 1 ? "" : "s"}`,
      observed: over.slice(0, 3).map((x) => `${x.name}: ${x.ordinary} admitted`).join("; ") + (over.length > 3 ? `; and ${over.length - 3} more` : ""), comparedWith: over.slice(0, 3).map((x) => `${x.intake} approved (${p(x.ordinary / x.intake, 1)} utilisation)`).join("; "),
      why: "Approved intake is set per programme. General, OBC, SC, ST and EWS admissions count against it; supernumerary categories are excluded from this count." });
  }
  for (const [cat, label, cap] of [["NRI", "NRI", cfg.nriCapPercent], ["OCI", "OCI", cfg.ociFnCapPercent], ["FN", "foreign-national", cfg.ociFnCapPercent]] as const) {
    const n = y.byCategory[cat] ?? 0, prev = y.prevByCategory?.[cat] ?? 0;
    const overCap = y.intake > 0 && n > (y.intake * cap) / 100 && n >= cfg.minSpikeCount;
    const spike = n >= cfg.minSpikeCount && y.prevByCategory !== null && n >= cfg.spikeFactor * Math.max(prev, 1);
    if (overCap || spike) add("SUPERNUMERARY_SPIKE", overCap && spike ? "HIGH" : "MEDIUM", n / Math.max(prev, 1), { rule: `Unusual increase in ${label} admissions`, headline: `${label} admissions rose from ${prev} to ${n}`,
      observed: `${n} ${label} admissions in ${y.ay}${y.intake ? ` (${p(n / y.intake, 1)} of approved intake)` : ""}`, comparedWith: `${prev} in ${y.prevAy ?? "the previous year"}${y.intake ? `; illustrative allowance ${cap}% of intake = ${Math.floor((y.intake * cap) / 100)}` : ""}`,
      why: `${spike ? `The count is at least ${cfg.spikeFactor} times the previous year. ` : ""}${overCap ? "It also exceeds the configured allowance. " : ""}Steady supernumerary admissions within the allowance are not flagged.` }, cat);
  }
  if (y.prevAdmissions !== null && y.prevAdmissions >= cfg.minBaseline) {
    const g = ((y.admissions - y.prevAdmissions) / y.prevAdmissions) * 100;
    if (g > cfg.maxGrowthPercent) add("ENROLMENT_SPIKE", g > 75 ? "HIGH" : "MEDIUM", g / 100, { rule: "Sudden enrolment spike", headline: `Admissions rose ${g.toFixed(0)}% in one year`, observed: `${y.admissions} admissions in ${y.ay}`, comparedWith: `${y.prevAdmissions} in ${y.prevAy} (threshold ${cfg.maxGrowthPercent}% growth)`, why: "A large jump with no change in approved intake can mean unreported capacity, data entry errors or duplicated records." });
  }
  const ord = Object.entries(y.byCategory).filter(([k]) => cfg.maxShareByCategory[k] !== undefined).reduce((t, [, v]) => t + v, 0);
  if (ord >= 30) for (const [cat, max] of Object.entries(cfg.maxShareByCategory)) {
    const share = (y.byCategory[cat] ?? 0) / ord;
    if (share > max) add("CATEGORY_SKEW", share > max * 1.5 ? "HIGH" : "MEDIUM", share, { rule: "Unusual category distribution", headline: `${cat} is ${p(share)} of ordinary admissions`, observed: `${y.byCategory[cat]} of ${ord} ordinary admissions are ${cat}`, comparedWith: `Configured limit ${p(max)} for ${cat}`, why: "One category making up a very large share is rare. It can reflect a data-entry or mapping error." }, cat);
  }
  if (y.records >= 30 && y.missing / y.records > cfg.missingRateThreshold) {
    const r = y.missing / y.records;
    add("MISSING_ID_RATE", r > 0.3 ? "MEDIUM" : "LOW", r, { rule: "Many students without an APAAR ID", headline: `${p(r)} of students have no APAAR ID`, observed: `${y.missing} of ${y.records} records`, comparedWith: `Alert threshold ${p(cfg.missingRateThreshold)}`, why: "Records without an APAAR ID cannot be matched across institutions, which weakens duplicate detection." });
  }
  return out;
}
