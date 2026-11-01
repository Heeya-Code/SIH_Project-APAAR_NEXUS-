// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Repository-wide analysis: cross-institution conflicts (check 5) and anomaly alerts (rules + Isolation Forest).
// Everything here is idempotent: running it twice creates nothing new, and human review decisions are never overwritten.
import type { Prisma } from "@/generated/prisma/client";
import { decryptField } from "@/lib/crypto";
import { db } from "@/lib/db";
import { notifyNational } from "@/lib/notify";
import { loadProgrammeSeats } from "@/lib/queries/intake";
import { isolationForest, robustZ } from "./iforest";
import { bestSimilarity, nameSimilarity } from "./names";
import { DEFAULT_RULES, ruleAlerts, type InstYear, type RuleConfig, type Severity } from "./rules";

/** Alerts are produced for the two most recent academic years; earlier years stay available for trends only. */
export const ALERT_YEARS = ["2025-26", "2026-27"] as const;
const prevAyOf = (ay: string) => { const y = Number(ay.slice(0, 4)) - 1; return `${y}-${String((y + 1) % 100).padStart(2, "0")}`; };

type Rec = { id: string; institutionId: string; institution: string; apaarHmac: string | null; matchKey: string | null; dobKey: string | null; ref: string; ay: string; programme: string; name: string };

export async function detectConflicts(opts: { onlyStudentIds?: Set<string> } = {}): Promise<{ created: number; byKind: Record<string, number> }> {
  const rows = await db.$queryRaw<(Omit<Rec, "name" | "institution" | "programme" | "ref" | "ay"> & { institution: string; programme: string; ref: string; ay: string; enc: string })[]>`
    SELECT s.id, s."institutionId", s."apaarHmac", s."matchKey", s."dobKey", s."localStudentId" AS ref, e."academicYear" AS ay, p.name AS programme, i.name AS institution, si."fullNameEnc" AS enc
    FROM "Student" s
    JOIN LATERAL (SELECT "academicYear", "programmeId" FROM "Enrolment" WHERE "studentId" = s.id AND status = 'ENROLLED' ORDER BY "academicYear" DESC LIMIT 1) e ON true
    JOIN "Programme" p ON p.id = e."programmeId" JOIN "Institution" i ON i.id = s."institutionId" JOIN "StudentIdentity" si ON si."studentId" = s.id`;
  const recs: Rec[] = rows.map((r) => ({ ...r, name: decryptField(r.enc) }));
  const byApaar = new Map<string, Rec[]>(), byDob = new Map<string, Rec[]>();
  for (const r of recs) { if (r.apaarHmac) byApaar.set(r.apaarHmac, [...(byApaar.get(r.apaarHmac) ?? []), r]); if (r.dobKey) byDob.set(r.dobKey, [...(byDob.get(r.dobKey) ?? []), r]); }
  const seen = new Set<string>(), out: Prisma.DuplicateAlertCreateManyInput[] = [];
  const keep = (a: Rec, b: Rec) => !opts.onlyStudentIds || opts.onlyStudentIds.has(a.id) || opts.onlyStudentIds.has(b.id);
  const push = (kind: "WITHIN_INSTITUTION" | "EXACT_APAAR" | "CONFLICTING_IDENTITY" | "POTENTIAL_MATCH", a0: Rec, b0: Rec, sim: number, explanation: string) => {
    const [a, b] = a0.id < b0.id ? [a0, b0] : [b0, a0]; const k = `${a.id}|${b.id}`; if (seen.has(k) || !keep(a, b)) return; seen.add(k);
    const side = (r: Rec) => ({ institutionId: r.institutionId, institution: r.institution, programme: r.programme, academicYear: r.ay, studentRef: r.ref });
    out.push({ kind, score: Math.round(sim * 1000) / 1000, studentAId: a.id, studentBId: b.id, institutionAId: a.institutionId, institutionBId: b.institutionId, apaarHmac: a.apaarHmac && a.apaarHmac === b.apaarHmac ? a.apaarHmac : null,
      evidence: { sides: [side(a), side(b)], matched: { apaarId: !!a.apaarHmac && a.apaarHmac === b.apaarHmac, dateOfBirth: !!a.dobKey && a.dobKey === b.dobKey, name: sim >= 0.999 ? "exact" : sim >= 0.9 ? "similar" : "different" }, nameSimilarity: Math.round(sim * 100) / 100, explanation, note: "No identifier is stored in this record. This is a flag for human review, not a finding of wrongdoing." } as Prisma.InputJsonValue });
  };
  for (const g of byApaar.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
    const a = g[i], b = g[j], sim = bestSimilarity(a.name, b.name), same = (a.matchKey && a.matchKey === b.matchKey) || (a.dobKey === b.dobKey && sim >= 0.9);
    if (a.institutionId === b.institutionId) push("WITHIN_INSTITUTION", a, b, sim, `The same APAAR ID appears on two records at ${a.institution}. The student may have been entered twice.`);
    else if (same) push("EXACT_APAAR", a, b, sim, `The same APAAR ID, name and date of birth are enrolled at both ${a.institution} and ${b.institution}. The student may have moved without the earlier enrolment being closed.`);
    else push("CONFLICTING_IDENTITY", a, b, sim, `The same APAAR ID is enrolled at ${a.institution} and ${b.institution}, but the name or date of birth differs. One of the IDs may have been typed incorrectly.`);
  }
  for (const g of byDob.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
    const a = g[i], b = g[j]; if (a.institutionId === b.institutionId) continue;
    if (a.apaarHmac && a.apaarHmac === b.apaarHmac) continue;
    const sim = bestSimilarity(a.name, b.name); if (sim < 0.9) continue;
    push("POTENTIAL_MATCH", a, b, sim, `A student with a very similar name and the same date of birth is enrolled at ${a.institution} and ${b.institution}, but the APAAR IDs differ or one is missing. This may be the same person.`);
  }
  let created = 0; const byKind: Record<string, number> = {};
  for (let i = 0; i < out.length; i += 500) { const r = await db.duplicateAlert.createMany({ data: out.slice(i, i + 500), skipDuplicates: true }); created += r.count; }
  for (const o of out) byKind[o.kind] = (byKind[o.kind] ?? 0) + 1;
  const involved = [...new Set(out.flatMap((o) => [o.studentAId, o.studentBId]))];
  for (let i = 0; i < involved.length; i += 1000) await db.student.updateMany({ where: { id: { in: involved.slice(i, i + 1000) }, verification: "STRUCTURALLY_VALID" }, data: { verification: "FLAGGED_DUPLICATE" } });
  return { created, byKind };
}

// ------------------------------------------------------------------------------------------------
type Row = { institution_id: string; academic_year: string; category_code: string; n: number; missing: number; invalid: number };
const FEATURES = ["admissions growth", "ordinary-seat utilisation", "NRI share of intake", "OCI share of intake", "foreign-national share of intake", "TFWS share of intake", "EWS share of ordinary seats", "missing-ID rate", "invalid-ID rate"];

async function loadRuleConfig(): Promise<RuleConfig> {
  const rules = await db.complianceRule.findMany({ where: { active: true } });
  const get = (code: string) => rules.find((r) => r.code === code)?.parameters as Record<string, unknown> | undefined;
  const g = get("ANOMALY_YOY_GROWTH"), s = get("ANOMALY_CATEGORY_SKEW"), nri = get("SUPERNUMERARY_CAP_NRI"), ocifn = get("SUPERNUMERARY_CAP_OCI_FN");
  return { ...DEFAULT_RULES, ...(g ? { maxGrowthPercent: Number(g.maxGrowthPercent), minBaseline: Number(g.minBaseline) } : {}), ...(s ? { maxShareByCategory: s.maxShareByCategory as Record<string, number> } : {}),
    ...(nri ? { nriCapPercent: Number(nri.maxPercentOfBaseIntake) } : {}), ...(ocifn ? { ociFnCapPercent: Number(ocifn.maxPercentOfBaseIntake) } : {}) };
}

export async function loadInstYears(): Promise<(InstYear & { invalid: number; vector: number[] })[]> {
  const [rows, intakes, insts, seats] = await Promise.all([
    db.$queryRaw<Row[]>`SELECT institution_id, academic_year, category_code, count(*)::int AS n, count(*) FILTER (WHERE apaar_format = 'MISSING')::int AS missing, count(*) FILTER (WHERE apaar_format = 'INVALID_FORMAT')::int AS invalid FROM v_enrolment_analytics WHERE enrolment_status <> 'WITHDRAWN' GROUP BY 1, 2, 3`,
    db.approvedIntake.groupBy({ by: ["institutionId", "academicYear"], _sum: { baseIntake: true } }), db.institution.findMany({ select: { id: true, name: true } }), loadProgrammeSeats(),
  ]);
  const name = new Map(insts.map((i) => [i.id, i.name])), intake = new Map(intakes.map((i) => [`${i.institutionId}|${i.academicYear}`, i._sum.baseIntake ?? 0]));
  const sup = new Set(["NRI", "OCI", "FN", "TFWS"]), map = new Map<string, InstYear & { invalid: number; vector: number[] }>();
  for (const r of rows) {
    const k = `${r.institution_id}|${r.academic_year}`;
    const y = map.get(k) ?? { institutionId: r.institution_id, institutionName: name.get(r.institution_id) ?? "", ay: r.academic_year, prevAy: prevAyOf(r.academic_year), admissions: 0, prevAdmissions: null, ordinary: 0, intake: intake.get(k) ?? 0, records: 0, missing: 0, byCategory: {}, prevByCategory: null, programmes: (seats.get(k) ?? []).map((s) => ({ name: s.name, intake: s.intake, ordinary: s.ordinary })), invalid: 0, vector: [] };
    y.admissions += r.n; y.records += r.n; y.missing += r.missing; y.invalid += r.invalid; y.byCategory[r.category_code] = r.n; if (!sup.has(r.category_code)) y.ordinary += r.n; map.set(k, y);
  }
  for (const y of map.values()) { const p = map.get(`${y.institutionId}|${y.prevAy}`); if (p) { y.prevAdmissions = p.admissions; y.prevByCategory = p.byCategory; } }
  for (const y of map.values()) {
    const I = y.intake || 1, growth = y.prevAdmissions ? Math.max(-1, Math.min(2, (y.admissions - y.prevAdmissions) / y.prevAdmissions)) : 0;
    y.vector = [growth, y.ordinary / I, (y.byCategory.NRI ?? 0) / I, (y.byCategory.OCI ?? 0) / I, (y.byCategory.FN ?? 0) / I, (y.byCategory.TFWS ?? 0) / I, y.ordinary ? (y.byCategory.EWS ?? 0) / y.ordinary : 0, y.records ? y.missing / y.records : 0, y.records ? y.invalid / y.records : 0];
  }
  return [...map.values()];
}

type NewAlert = { institutionId: string; ay: string; kind: string; severity: Severity; score: number; detector: string; explanation: Record<string, unknown> };
const SEV: Record<Severity, "LOW" | "MEDIUM" | "HIGH"> = { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH" };

export async function buildAnomalyAlerts(): Promise<{ alerts: NewAlert[]; screened: number; ranking: { institution: string; ay: string; score: number }[] }> {
  const [years, cfg, subs] = await Promise.all([loadInstYears(), loadRuleConfig(), db.dataSubmission.findMany({ where: { status: { not: "SUPERSEDED" } }, select: { institutionId: true, academicYear: true, rowCount: true, version: true } })]);
  const alerts: NewAlert[] = [], inScope = (ay: string) => (ALERT_YEARS as readonly string[]).includes(ay);
  for (const y of years) if (inScope(y.ay)) for (const a of ruleAlerts(y, cfg)) alerts.push({ institutionId: a.institutionId, ay: a.ay, kind: a.variant ? `${a.kind}:${a.variant}` : a.kind, severity: a.severity, score: a.score, detector: "RULE_BASED_v1", explanation: a.explanation });
  // bulk submissions: one file far larger than that institution's usual yearly submission
  for (const y of years) if (inScope(y.ay)) {
    const mine = subs.filter((s) => s.institutionId === y.institutionId), cur = mine.filter((s) => s.academicYear === y.ay).sort((a, b) => b.version - a.version)[0];
    const earlier = mine.filter((s) => s.academicYear < y.ay).map((s) => s.rowCount).sort((a, b) => a - b), median = earlier.length ? earlier[Math.floor(earlier.length / 2)] : 0;
    if (cur && median > 0 && cur.rowCount >= 100 && cur.rowCount > 1.5 * median) alerts.push({ institutionId: y.institutionId, ay: y.ay, kind: "BULK_SUBMISSION", severity: "MEDIUM", score: cur.rowCount / median, detector: "RULE_BASED_v1",
      explanation: { rule: "Large bulk admission submission", headline: `One submission of ${cur.rowCount} records`, observed: `${cur.rowCount} records in the ${y.ay} submission`, comparedWith: `Typical earlier submission: about ${median} records`, why: "A file much larger than usual can mean duplicated rows or a change in capacity that was not reported.", caution: "This is an unusual pattern that needs a human look, not proof of wrongdoing. There may be a legitimate explanation." } });
  }
  // Isolation Forest over every institution-year with an intake figure (the more history, the better the baseline)
  const pool = years.filter((y) => y.intake > 0 && y.records > 0), data = pool.map((y) => y.vector), scores = isolationForest(data, { seed: 20261031 }), rz = robustZ(data);
  const ranked = pool.map((y, i) => ({ y, s: scores[i], i })).sort((a, b) => b.s - a.s);
  const limit = Math.max(3, Math.ceil(pool.length * 0.1));
  // An institution that is "different" in most of its years is structurally different from its peers (for example a PGDM
  // school with steady supernumerary admissions), not behaving unusually. Only deviations from its own pattern are reported.
  const topYears = new Map<string, number>(); ranked.slice(0, limit).forEach(({ y }) => topYears.set(y.institutionId, (topYears.get(y.institutionId) ?? 0) + 1));
  const fmt = (j: number, v: number) => (j === 0 ? `${(v * 100).toFixed(0)}%` : `${(v * 100).toFixed(1)}%`);
  ranked.slice(0, limit).forEach(({ y, s, i }) => {
    if (!inScope(y.ay) || s < 0.55 || (topYears.get(y.institutionId) ?? 0) >= 3) return;
    const why = rz.z(data[i]).map((z, j) => ({ j, z })).filter((x) => Math.abs(x.z) >= 3).sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 3);
    if (!why.length) return; // a score nobody can explain is not shown
    alerts.push({ institutionId: y.institutionId, ay: y.ay, kind: "STATISTICAL_OUTLIER", severity: s >= 0.65 ? "MEDIUM" : "LOW", score: s, detector: "ISOLATION_FOREST_v1",
      explanation: { rule: "Statistical outlier (Isolation Forest)", headline: `Unlike most institution-years: ${why.map((x) => FEATURES[x.j]).join(", ")}`, observed: why.map((x) => `${FEATURES[x.j]} is ${fmt(x.j, data[i][x.j])}`).join("; "), comparedWith: why.map((x) => `typical ${fmt(x.j, rz.median[x.j])}`).join("; "),
        why: `An unsupervised model ranked this institution-year ${ranked.findIndex((r) => r.i === i) + 1} of ${pool.length} for how easily it is isolated from the others (score ${s.toFixed(2)}). It uses no labels, so it can only say "different", never "wrong". With ${pool.length} institution-years of synthetic data it is a screening aid only.`, caution: "This is a statistical pattern that needs a human look, not proof of wrongdoing." } });
  });
  return { alerts, screened: pool.length, ranking: ranked.map((r) => ({ institution: r.y.institutionName, ay: r.y.ay, score: r.s })) };
}

/** Writes alerts without touching anything a human has already reviewed; removes OPEN alerts whose condition has cleared. */
export async function persistAnomalies(alerts: NewAlert[], institutionIds?: string[]) {
  const detectors = ["RULE_BASED_v1", "ISOLATION_FOREST_v1"], scope: Prisma.AnomalyAlertWhereInput = { detector: { in: detectors }, academicYear: { in: [...ALERT_YEARS] }, ...(institutionIds ? { institutionId: { in: institutionIds } } : {}) };
  const existing = await db.anomalyAlert.findMany({ where: scope });
  const key = (a: { institutionId: string; academicYear?: string; ay?: string; kind: string; detector: string }) => `${a.institutionId}|${a.academicYear ?? a.ay}|${a.kind}|${a.detector}`;
  const have = new Map(existing.map((e) => [key(e), e])), wanted = new Set<string>(), created: NewAlert[] = [];
  for (const a of alerts.filter((x) => !institutionIds || institutionIds.includes(x.institutionId))) {
    const k = key(a); wanted.add(k); const e = have.get(k);
    if (!e) { await db.anomalyAlert.create({ data: { institutionId: a.institutionId, academicYear: a.ay, kind: a.kind, severity: SEV[a.severity], score: a.score, detector: a.detector, explanation: a.explanation as Prisma.InputJsonValue } }); created.push(a); }
    else if (e.status === "OPEN") await db.anomalyAlert.update({ where: { id: e.id }, data: { severity: SEV[a.severity], score: a.score, explanation: a.explanation as Prisma.InputJsonValue } });
  }
  const stale = existing.filter((e) => e.status === "OPEN" && !wanted.has(key(e))).map((e) => e.id);
  if (stale.length) await db.anomalyAlert.deleteMany({ where: { id: { in: stale } } });
  return { created, removed: stale.length };
}

export async function refreshAnalysis(opts: { institutionIds?: string[]; notify?: boolean } = {}) {
  const { alerts, screened, ranking } = await buildAnomalyAlerts();
  const { created, removed } = await persistAnomalies(alerts, opts.institutionIds);
  const conflicts = await detectConflicts();
  if (opts.notify !== false) for (const a of created.filter((x) => x.severity === "HIGH")) await notifyNational({ kind: "ALERT", title: "High-severity alert", body: String(a.explanation.headline), link: "/aicte/alerts" }, { institutionId: a.institutionId });
  return { alertsCreated: created.length, alertsRemoved: removed, alertsTotal: alerts.length, conflicts, screened, ranking };
}

export async function afterSubmission(p: { institutionId: string; academicYear: string; submissionId: string; newStudentIds: string[]; rowCount: number }) {
  const conflicts = p.newStudentIds.length ? await detectConflicts({ onlyStudentIds: new Set(p.newStudentIds) }) : { created: 0, byKind: {} };
  const { alerts } = await buildAnomalyAlerts();
  const { created } = await persistAnomalies(alerts, [p.institutionId]);
  for (const a of created.filter((x) => x.severity !== "LOW")) await notifyNational({ kind: "ALERT", title: `${a.severity === "HIGH" ? "High-severity" : "New"} alert`, body: String(a.explanation.headline), link: "/aicte/alerts" }, { institutionId: p.institutionId });
  if (conflicts.created) await notifyNational({ kind: "CONFLICT", title: `${conflicts.created} cross-institution conflict(s) need review`, body: "A new submission contains students who appear to be enrolled elsewhere.", link: "/aicte/alerts?tab=conflicts" }, { institutionId: p.institutionId });
  return { conflicts, alertsCreated: created.length };
}
