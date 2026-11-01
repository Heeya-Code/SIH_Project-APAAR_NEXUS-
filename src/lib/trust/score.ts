// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Institution Trust Score: a transparent PROTOTYPE assessment metric. It is NOT an AICTE accreditation,
// approval or rating. Seven components, each 0-100, combined with configurable weights that sum to 100.
// Formulas are documented in docs/TRUST_SCORE.md and every score shows what lowered it and how to improve it.
import { z } from "zod";

export const COMPONENT_KEYS = ["completeness", "validity", "duplicates", "intake", "consistency", "timeliness", "conflicts"] as const;
export type ComponentKey = (typeof COMPONENT_KEYS)[number];
export const DEFAULT_WEIGHTS: Record<ComponentKey, number> = { completeness: 20, validity: 20, duplicates: 15, intake: 20, consistency: 10, timeliness: 10, conflicts: 5 };

const weightsSchema = z.object(Object.fromEntries(COMPONENT_KEYS.map((k) => [k, z.number().min(0).max(100)])) as Record<ComponentKey, z.ZodNumber>).refine((w) => Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 100) < 1e-9, "weights must sum to 100");
/** Weights come from TRUST_WEIGHTS_JSON when valid, otherwise the documented defaults. */
export function loadWeights(env = process.env.TRUST_WEIGHTS_JSON): { weights: Record<ComponentKey, number>; source: "environment" | "default"; warning?: string } {
  if (!env) return { weights: DEFAULT_WEIGHTS, source: "default" };
  try { const p = weightsSchema.safeParse(JSON.parse(env)); if (p.success) return { weights: p.data, source: "environment" }; return { weights: DEFAULT_WEIGHTS, source: "default", warning: `TRUST_WEIGHTS_JSON ignored: ${p.error.issues[0]?.message}` }; }
  catch { return { weights: DEFAULT_WEIGHTS, source: "default", warning: "TRUST_WEIGHTS_JSON ignored: not valid JSON" }; }
}

export type TrustMetrics = {
  records: number; missingApaar: number; apaarProvided: number; apaarWellFormed: number; duplicateRecords: number;
  ordinary: number; intake: number; /** seats above approved intake, summed per programme */ overshoot?: number; capBreaches: number; firstSubmissionRejectRate: number | null;
  submitted: boolean; daysLate: number | null; openConflicts: number; openHighAnomalies: number;
};
export type Component = { key: ComponentKey; label: string; weight: number; score: number; pointsLost: number; detail: string; recommendation: string | null };
export type Band = "STRONG" | "GOOD" | "WATCH" | "AT_RISK";
export type TrustResult = { scored: true; overall: number; band: Band; components: Component[] } | { scored: false; reason: string };

export const BAND_LABEL: Record<Band, string> = { STRONG: "Strong", GOOD: "Good", WATCH: "Needs attention", AT_RISK: "At risk" };
export const bandOf = (s: number): Band => (s >= 85 ? "STRONG" : s >= 70 ? "GOOD" : s >= 50 ? "WATCH" : "AT_RISK");
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function computeTrust(m: TrustMetrics, weights = DEFAULT_WEIGHTS): TrustResult {
  if (!m.submitted) return { scored: false, reason: "No accepted submission for this year yet, so there is nothing to assess." };
  if (m.records === 0) return { scored: false, reason: "The accepted submission contains no admissions." };
  const R = m.records;
  const overshoot = m.intake > 0 ? (m.overshoot ?? Math.max(m.ordinary - m.intake, 0)) / m.intake : 0;
  const dupRate = m.duplicateRecords / R;
  const raw: Record<ComponentKey, { score: number; detail: string; rec: string }> = {
    completeness: { score: clamp(100 * (1 - m.missingApaar / R)), detail: `${R - m.missingApaar} of ${R} students have an APAAR ID on file.`, rec: "Collect the missing APAAR IDs from students and resubmit those records." },
    validity: { score: m.apaarProvided ? clamp((100 * m.apaarWellFormed) / m.apaarProvided) : 0, detail: `${m.apaarWellFormed} of ${m.apaarProvided} provided APAAR IDs are correctly formatted (a format check only, not an official verification).`, rec: "Check the malformed IDs for missing digits or typing errors and correct them." },
    duplicates: { score: clamp(100 * (1 - dupRate / 0.05)), detail: `${m.duplicateRecords} duplicate or repeated records (${pct(dupRate)} of records; the score reaches zero at 5%).`, rec: "Review repeated students and withdraw the extra enrolment records." },
    intake: { score: clamp(100 * (1 - overshoot / 0.25) - 20 * m.capBreaches), detail: m.intake ? `${m.ordinary} ordinary admissions against ${m.intake} approved seats${overshoot > 0 ? `, ${pct(overshoot)} above intake` : ""}${m.capBreaches ? `; ${m.capBreaches} supernumerary allowance(s) exceeded` : ""}.` : "No approved intake on record.", rec: "Confirm every student is in the correct programme; admissions above approved intake need regulatory review." },
    consistency: { score: m.firstSubmissionRejectRate === null ? 100 : clamp(100 * (1 - m.firstSubmissionRejectRate / 0.1)), detail: m.firstSubmissionRejectRate === null ? "No first-submission error rate recorded." : `${pct(m.firstSubmissionRejectRate)} of rows in the first submission had errors (the score reaches zero at 10%).`, rec: "Use the validation report before submitting so fewer rows need correction." },
    timeliness: { score: m.daysLate === null ? 0 : m.daysLate <= 0 ? 100 : clamp(100 - 5 * m.daysLate), detail: m.daysLate === null ? "Submission date unknown." : m.daysLate <= 0 ? "Submitted on or before the 30 September deadline." : `Submitted ${m.daysLate} day(s) after the 30 September deadline (5 points lost per day).`, rec: "Start the submission earlier so it is complete by 30 September." },
    conflicts: { score: clamp(100 - 10 * m.openConflicts - 25 * m.openHighAnomalies), detail: `${m.openConflicts} unresolved cross-institution conflict(s) and ${m.openHighAnomalies} unresolved high-severity alert(s).`, rec: "Work with AICTE to resolve open conflicts and alerts." },
  };
  const labels: Record<ComponentKey, string> = { completeness: "Identifier completeness", validity: "APAAR format validity", duplicates: "Duplicate records", intake: "Intake compliance", consistency: "Data consistency", timeliness: "Submission timeliness", conflicts: "Unresolved conflicts" };
  const components = COMPONENT_KEYS.map((key): Component => {
    const r = raw[key]; const weight = weights[key];
    return { key, label: labels[key], weight, score: Math.round(r.score * 10) / 10, pointsLost: Math.round(((100 - r.score) * weight) / 100 * 10) / 10, detail: r.detail, recommendation: r.score < 85 ? r.rec : null };
  });
  const overall = Math.round(components.reduce((t, c) => t + (c.score * c.weight) / 100, 0) * 10) / 10;
  return { scored: true, overall, band: bandOf(overall), components };
}
