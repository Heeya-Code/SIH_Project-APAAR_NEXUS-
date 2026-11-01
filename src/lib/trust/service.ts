// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Loads the metrics that feed the Trust Score for every institution and year, in a handful of queries.
import { db } from "@/lib/db";
import { ACADEMIC_YEARS } from "@/lib/years";
import { loadProgrammeSeats, seatsOf } from "@/lib/queries/intake";
import { computeTrust, loadWeights, type TrustMetrics, type TrustResult } from "./score";

export type TrustRow = { institutionId: string; ay: string; metrics: TrustMetrics; result: TrustResult };
const SUP = new Set(["NRI", "OCI", "FN", "TFWS"]);
export const deadlineFor = (ay: string) => new Date(Date.UTC(Number(ay.slice(0, 4)), 8, 30, 18, 29, 59)); // 30 September, 23:59:59 IST

export async function loadTrust(): Promise<{ rows: Map<string, TrustRow>; weights: ReturnType<typeof loadWeights> }> {
  const seats = await loadProgrammeSeats();
  const [cat, intakes, subs, dups, anoms, rules, insts] = await Promise.all([
    db.$queryRaw<{ institution_id: string; ay: string; category_code: string; n: number; missing: number; invalid: number; wf: number }[]>`SELECT institution_id, academic_year AS ay, category_code, count(*)::int AS n, count(*) FILTER (WHERE apaar_format = 'MISSING')::int AS missing, count(*) FILTER (WHERE apaar_format = 'INVALID_FORMAT')::int AS invalid, count(*) FILTER (WHERE apaar_format = 'WELL_FORMED')::int AS wf FROM v_enrolment_analytics WHERE enrolment_status <> 'WITHDRAWN' GROUP BY 1, 2, 3`,
    db.approvedIntake.groupBy({ by: ["institutionId", "academicYear"], _sum: { baseIntake: true } }),
    db.dataSubmission.findMany({ select: { institutionId: true, academicYear: true, version: true, rowCount: true, rejectedCount: true, acceptedAt: true, submittedAt: true } }),
    db.duplicateAlert.findMany({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { kind: true, evidence: true } }),
    db.anomalyAlert.findMany({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] }, severity: { in: ["HIGH", "CRITICAL"] } }, select: { institutionId: true, academicYear: true } }),
    db.complianceRule.findMany({ where: { active: true, kind: "SUPERNUMERARY_CAP" } }), db.institution.findMany({ select: { id: true } }),
  ]);
  const caps = rules.map((r) => r.parameters as { categories: string[]; maxPercentOfBaseIntake: number });
  const intake = new Map(intakes.map((i) => [`${i.institutionId}|${i.academicYear}`, i._sum.baseIntake ?? 0]));
  const dupBy = new Map<string, { dup: number; conflicts: number }>();
  for (const d of dups) for (const side of ((d.evidence as { sides?: { institutionId: string; academicYear: string }[] })?.sides ?? [])) {
    const k = `${side.institutionId}|${side.academicYear}`, v = dupBy.get(k) ?? { dup: 0, conflicts: 0 };
    if (d.kind !== "CONFLICTING_IDENTITY") v.dup++; v.conflicts++; dupBy.set(k, v);
  }
  const rows = new Map<string, TrustRow>(), weights = loadWeights();
  for (const inst of insts) for (const ay of ACADEMIC_YEARS) {
    const k = `${inst.id}|${ay}`, mine = cat.filter((c) => c.institution_id === inst.id && c.ay === ay);
    const records = mine.reduce((t, c) => t + c.n, 0), counts = Object.fromEntries(mine.map((c) => [c.category_code, c.n]));
    const missing = mine.reduce((t, c) => t + c.missing, 0), invalid = mine.reduce((t, c) => t + c.invalid, 0), wf = mine.reduce((t, c) => t + c.wf, 0);
    const I = intake.get(k) ?? 0, ordinary = mine.filter((c) => !SUP.has(c.category_code)).reduce((t, c) => t + c.n, 0);
    const capBreaches = caps.filter((c) => c.categories.reduce((t, x) => t + (counts[x] ?? 0), 0) > Math.floor((I * c.maxPercentOfBaseIntake) / 100)).length;
    const mineSubs = subs.filter((s) => s.institutionId === inst.id && s.academicYear === ay), first = mineSubs.find((s) => s.version === 1);
    const times = mineSubs.map((s) => s.acceptedAt ?? s.submittedAt).filter((t): t is Date => !!t).sort((a, b) => a.getTime() - b.getTime());
    const d = dupBy.get(k);
    const metrics: TrustMetrics = { records, missingApaar: missing, apaarProvided: wf + invalid, apaarWellFormed: wf, duplicateRecords: d?.dup ?? 0, ordinary, intake: I, overshoot: seatsOf(seats.get(k) ?? []).over, capBreaches,
      firstSubmissionRejectRate: first && first.rowCount ? first.rejectedCount / first.rowCount : null, submitted: times.length > 0 && records > 0,
      daysLate: times[0] ? Math.ceil((times[0].getTime() - deadlineFor(ay).getTime()) / 864e5) : null, openConflicts: d?.conflicts ?? 0, openHighAnomalies: anoms.filter((a) => a.institutionId === inst.id && a.academicYear === ay).length };
    rows.set(k, { institutionId: inst.id, ay, metrics, result: computeTrust(metrics, weights.weights) });
  }
  return { rows, weights };
}
