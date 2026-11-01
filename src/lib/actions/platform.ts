// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, verifyAuditChain, type ChainReport } from "@/lib/audit";
import { assertPermission } from "@/lib/auth/guards";
import { clientMeta, revokeUserSessions } from "@/lib/auth/session";
import { loadApaarForReveal } from "@/lib/queries/institution";

const uuid = z.string().uuid();

/** Reveal one full APAAR ID. Institution admins only, own institution only, every reveal audited. */
export async function revealApaarAction(studentId: string): Promise<{ value?: string; error?: string }> {
  const user = await assertPermission("students:reveal-apaar");
  if (!uuid.safeParse(studentId).success) return { error: "Invalid request." };
  const meta = await clientMeta();
  try {
    const value = await loadApaarForReveal(user, studentId);
    await audit({ actor: user, action: "STUDENT_APAAR_REVEALED", entityType: "Student", entityId: studentId, institutionId: user.institutionId, ipHash: meta.ipHash });
    return value ? { value } : { error: "No APAAR ID on file for this student." };
  } catch {
    await audit({ actor: user, action: "STUDENT_APAAR_REVEAL_DENIED", outcome: "DENIED", entityType: "Student", entityId: studentId, institutionId: user.institutionId, ipHash: meta.ipHash });
    return { error: "You can only reveal IDs for students of your own institution." };
  }
}

export async function revokeSessionsAction(userId: string): Promise<void> {
  const admin = await assertPermission("users:manage");
  if (!uuid.safeParse(userId).success) throw new Error("Invalid user");
  const n = await revokeUserSessions(userId, `revoked_by_${admin.id}`);
  await audit({ actor: admin, action: "SESSIONS_REVOKED", entityType: "User", entityId: userId, metadata: { count: n } });
  revalidatePath("/admin");
}

export async function setUserActiveAction(userId: string, active: boolean): Promise<void> {
  const admin = await assertPermission("users:manage");
  if (!uuid.safeParse(userId).success) throw new Error("Invalid user");
  if (userId === admin.id) throw new Error("You cannot change your own access.");
  await db.user.update({ where: { id: userId }, data: { isActive: active } });
  if (!active) await revokeUserSessions(userId, "account_deactivated");
  await audit({ actor: admin, action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED", entityType: "User", entityId: userId });
  revalidatePath("/admin");
}

export async function verifyAuditChainAction(): Promise<ChainReport> {
  const user = await assertPermission("audit:view:all");
  const report = await verifyAuditChain();
  await audit({ actor: user, action: "AUDIT_CHAIN_VERIFIED", metadata: { ok: report.ok, checked: report.checked } });
  return report;
}
