// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Demo support: makes Demo A repeatable by removing what an upload created for one institution and year.
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { Actor } from "@/lib/auth/permissions";

export const demoMode = () => process.env.DEMO_MODE === "true";
export const DEMO_AY = "2026-27";

export async function resetInstitutionDemo(institutionId: string, ay = DEMO_AY) {
  const enrol = await db.enrolment.findMany({ where: { institutionId, academicYear: ay }, select: { studentId: true } });
  const ids = enrol.map((e) => e.studentId);
  let students = 0;
  for (let i = 0; i < ids.length; i += 1000) students += (await db.student.deleteMany({ where: { id: { in: ids.slice(i, i + 1000) }, institutionId } })).count; // cascades identity, enrolment, conflict alerts
  const subs = (await db.dataSubmission.deleteMany({ where: { institutionId, academicYear: ay } })).count;
  const alerts = (await db.anomalyAlert.deleteMany({ where: { institutionId, academicYear: ay } })).count;
  await db.notification.deleteMany({ where: { kind: { in: ["SUBMISSION", "ALERT"] }, user: { institutionId } } });
  // counterpart students that were only flagged because of the removed records are no longer in conflict
  await db.$executeRaw`UPDATE "Student" s SET verification = 'STRUCTURALLY_VALID' WHERE s.verification = 'FLAGGED_DUPLICATE' AND NOT EXISTS (SELECT 1 FROM "DuplicateAlert" d WHERE d.status IN ('OPEN','UNDER_REVIEW','CONFIRMED') AND (d."studentAId" = s.id OR d."studentBId" = s.id))`;
  return { students, submissions: subs, alerts };
}

export async function resetForActor(actor: Actor) {
  if (!demoMode()) throw new Error("Demo reset is only available when DEMO_MODE=true");
  if (!actor.institutionId) throw new Error("Institution account required");
  const r = await resetInstitutionDemo(actor.institutionId);
  await audit({ actor, action: "DEMO_RESET", institutionId: actor.institutionId, metadata: { academicYear: DEMO_AY, ...r } });
  return r;
}
