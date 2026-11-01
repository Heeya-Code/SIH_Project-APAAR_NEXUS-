// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { db } from "@/lib/db";

type N = { kind: string; title: string; body: string; link?: string };

export async function notifyUsers(userIds: string[], n: N) {
  if (userIds.length) await db.notification.createMany({ data: userIds.map((userId) => ({ userId, ...n })) });
}
export async function notifyInstitution(institutionId: string, n: N) {
  const users = await db.user.findMany({ where: { institutionId, isActive: true, role: { in: ["INSTITUTION_ADMIN", "DATA_ENTRY_OPERATOR"] } }, select: { id: true } });
  await notifyUsers(users.map((u) => u.id), n);
}
/** AICTE administrators, plus the regional officer responsible for the institution when one is given. */
export async function notifyNational(n: N, scope?: { institutionId: string }) {
  const region = scope ? (await db.institution.findUnique({ where: { id: scope.institutionId }, select: { region: true } }))?.region : undefined;
  const users = await db.user.findMany({ where: { isActive: true, OR: [{ role: "AICTE_ADMIN" }, ...(region ? [{ role: "REGIONAL_OFFICER" as const, region }] : [])] }, select: { id: true } });
  await notifyUsers(users.map((u) => u.id), n);
}
