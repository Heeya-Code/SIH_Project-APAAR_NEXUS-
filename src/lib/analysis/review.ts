// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Review workflow for anomaly alerts and cross-institution conflicts. Regional officers can only act inside their region.
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { notifyInstitution } from "@/lib/notify";
import { institutionScope, type Actor } from "@/lib/auth/permissions";

export type ReviewStatus = "UNDER_REVIEW" | "CONFIRMED" | "DISMISSED";
type R = { ok: true } | { ok: false; error: string };
const inScopeIds = async (a: Actor) => (await db.institution.findMany({ where: institutionScope(a), select: { id: true } })).map((i) => i.id);

export async function reviewAnomaly(a: Actor, id: string, status: ReviewStatus, note: string, meta: { ipHash?: string | null } = {}): Promise<R> {
  const row = await db.anomalyAlert.findFirst({ where: { id, institutionId: { in: await inScopeIds(a) } } });
  if (!row) return { ok: false, error: "That alert was not found in your scope." };
  await db.anomalyAlert.update({ where: { id }, data: { status, reviewNote: note.slice(0, 500) || null, reviewedById: a.id, reviewedAt: new Date() } });
  await audit({ actor: a, action: "ALERT_REVIEWED", entityType: "AnomalyAlert", entityId: id, institutionId: row.institutionId, ipHash: meta.ipHash, metadata: { status, kind: row.kind } });
  if (status === "CONFIRMED") await notifyInstitution(row.institutionId, { kind: "ALERT", title: "AICTE has confirmed an alert for your institution", body: `${row.kind.replaceAll("_", " ").toLowerCase()} (${row.academicYear}). ${note.slice(0, 200)}`, link: "/institution/trust" });
  return { ok: true };
}

export async function reviewConflict(a: Actor, id: string, status: ReviewStatus, note: string, meta: { ipHash?: string | null } = {}): Promise<R> {
  const ids = await inScopeIds(a);
  const row = await db.duplicateAlert.findFirst({ where: { id, OR: [{ institutionAId: { in: ids } }, { institutionBId: { in: ids } }] } });
  if (!row) return { ok: false, error: "That conflict was not found in your scope." };
  await db.duplicateAlert.update({ where: { id }, data: { status, reviewNote: note.slice(0, 500) || null, reviewedById: a.id, reviewedAt: new Date() } });
  if (status === "DISMISSED") for (const sid of [row.studentAId, row.studentBId]) {
    const open = await db.duplicateAlert.count({ where: { id: { not: id }, status: { in: ["OPEN", "UNDER_REVIEW", "CONFIRMED"] }, OR: [{ studentAId: sid }, { studentBId: sid }] } });
    if (!open) await db.student.updateMany({ where: { id: sid, verification: "FLAGGED_DUPLICATE" }, data: { verification: "STRUCTURALLY_VALID" } });
  }
  await audit({ actor: a, action: "CONFLICT_REVIEWED", entityType: "DuplicateAlert", entityId: id, institutionId: row.institutionAId, ipHash: meta.ipHash, metadata: { status, kind: row.kind } });
  if (status === "CONFIRMED") for (const iid of new Set([row.institutionAId, row.institutionBId])) await notifyInstitution(iid, { kind: "CONFLICT", title: "A cross-institution conflict was confirmed", body: "A student appears to be enrolled at two institutions. Please check your records and withdraw any enrolment that has ended.", link: "/institution/students" });
  return { ok: true };
}
