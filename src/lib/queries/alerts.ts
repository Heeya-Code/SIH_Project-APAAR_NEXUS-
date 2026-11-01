// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Alerts and conflicts, scoped through institutionScope(): a regional officer sees only their region's institutions.
import { db } from "@/lib/db";
import { institutionScope, type Actor } from "@/lib/auth/permissions";

const ids = async (a: Actor) => (await db.institution.findMany({ where: institutionScope(a), select: { id: true } })).map((i) => i.id);
export type ConflictEvidence = { sides: { institutionId: string; institution: string; programme: string; academicYear: string; studentRef: string }[]; matched: { apaarId: boolean; dateOfBirth: boolean; name: string }; nameSimilarity: number; explanation: string; note: string };
export type AnomalyExplanation = { rule: string; headline: string; observed: string; comparedWith: string; why: string; caution: string };

export async function getAnomalies(a: Actor, f: { status?: "open" | "all"; severity?: string } = {}) {
  const scope = await ids(a);
  return db.anomalyAlert.findMany({ where: { institutionId: { in: scope }, ...(f.status === "all" ? {} : { status: { in: ["OPEN", "UNDER_REVIEW"] } }), ...(f.severity ? { severity: f.severity as "HIGH" } : {}) }, include: { institution: { select: { id: true, name: true, shortName: true, stateName: true } } }, orderBy: [{ severity: "desc" }, { createdAt: "desc" }], take: 200 });
}
export async function getConflicts(a: Actor, f: { status?: "open" | "all"; kind?: string } = {}) {
  const scope = await ids(a);
  return db.duplicateAlert.findMany({ where: { OR: [{ institutionAId: { in: scope } }, { institutionBId: { in: scope } }], ...(f.status === "all" ? {} : { status: { in: ["OPEN", "UNDER_REVIEW"] } }), ...(f.kind ? { kind: f.kind as "EXACT_APAAR" } : {}) }, orderBy: [{ status: "asc" }, { score: "desc" }], take: 200 });
}
export async function alertCounts(a: Actor) {
  const scope = await ids(a);
  const open = { in: ["OPEN", "UNDER_REVIEW"] as ("OPEN" | "UNDER_REVIEW")[] };
  const [byKind, bySev, conflictsByKind] = await Promise.all([
    db.anomalyAlert.groupBy({ by: ["kind"], where: { institutionId: { in: scope }, status: open }, _count: true }), db.anomalyAlert.groupBy({ by: ["severity"], where: { institutionId: { in: scope }, status: open }, _count: true }),
    db.duplicateAlert.groupBy({ by: ["kind"], where: { OR: [{ institutionAId: { in: scope } }, { institutionBId: { in: scope } }], status: open }, _count: true })]);
  const [anomalies, high, conflicts] = await Promise.all([
    db.anomalyAlert.count({ where: { institutionId: { in: scope }, status: { in: ["OPEN", "UNDER_REVIEW"] } } }), db.anomalyAlert.count({ where: { institutionId: { in: scope }, status: { in: ["OPEN", "UNDER_REVIEW"] }, severity: { in: ["HIGH", "CRITICAL"] } } }),
    db.duplicateAlert.count({ where: { OR: [{ institutionAId: { in: scope } }, { institutionBId: { in: scope } }], status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);
  return { anomalies, high, conflicts, byKind: Object.fromEntries(byKind.map((g) => [g.kind, g._count])) as Record<string, number>, bySeverity: Object.fromEntries(bySev.map((g) => [g.severity, g._count])) as Record<string, number>, conflictsByKind: Object.fromEntries(conflictsByKind.map((g) => [g.kind, g._count])) as Record<string, number> };
}
