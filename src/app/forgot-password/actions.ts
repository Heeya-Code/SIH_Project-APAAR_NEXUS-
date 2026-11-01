// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { keyedHash } from "@/lib/crypto";
import { db } from "@/lib/db";
import { notifyUsers } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { clientMeta } from "@/lib/auth/session";

export type ResetState = { done?: boolean; error?: string };
/** Always answers the same way, whether or not the account exists. The only effect is an audit entry and a notice to an administrator. */
export async function requestResetAction(_p: ResetState, form: FormData): Promise<ResetState> {
  const meta = await clientMeta();
  const email = z.string().trim().toLowerCase().email().max(254).safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  if (!rateLimit(`reset:${meta.ip}`, 5, 15 * 60_000).ok) return { error: "Too many requests. Please wait a few minutes." };
  const u = await db.user.findUnique({ where: { email: email.data }, select: { id: true, role: true, institutionId: true } });
  await audit({ action: "PASSWORD_RESET_REQUESTED", outcome: "SUCCESS", ipHash: meta.ipHash, metadata: { emailHash: keyedHash("email", email.data), accountFound: !!u } });
  if (u) {
    const admins = await db.user.findMany({ where: { isActive: true, OR: [{ role: "SUPER_ADMIN" }, ...(u.institutionId ? [{ role: "INSTITUTION_ADMIN" as const, institutionId: u.institutionId, NOT: { id: u.id } }] : [])] }, select: { id: true } });
    await notifyUsers(admins.map((a) => a.id), { kind: "ACCOUNT", title: "A password reset was requested", body: "Someone asked to reset an account you administer. Contact them to confirm it was them.", link: "/admin/users" });
  }
  return { done: true };
}
