// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { keyedHash } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { ROLE_META } from "@/lib/auth/permissions";
import { clientMeta, createSession, destroyCurrentSession, getAuth } from "@/lib/auth/session";

export type LoginState = { error?: string };

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(200) });
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
// Compared against when the account does not exist, so response time does not reveal it.
const DUMMY_HASH = "$2b$12$6JS3WsKIBArGWpzbvgJHweMl3/ytY3l/Ea01eqZeF8pWR.ID6RGoC";
const GENERIC = "Email or password is incorrect, or the account is temporarily locked.";

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const meta = await clientMeta();
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter a valid email address and your password." };
  const { email, password } = parsed.data;

  const byIp = rateLimit(`login:ip:${meta.ip}`, 30, 10 * 60_000);
  const byAcct = rateLimit(`login:acct:${email}`, 8, 10 * 60_000);
  if (!byIp.ok || !byAcct.ok) {
    await audit({ action: "LOGIN_RATE_LIMITED", outcome: "DENIED", ipHash: meta.ipHash, metadata: { emailHash: keyedHash("email", email) } });
    return { error: `Too many sign-in attempts. Try again in ${Math.max(byIp.retryAfterSec, byAcct.retryAfterSec)} seconds.` };
  }

  const user = await db.user.findUnique({ where: { email } });
  const locked = !!user?.lockedUntil && user.lockedUntil.getTime() > Date.now();
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok || !user.isActive || locked) {
    if (user && !locked && user.isActive) {
      const failed = user.failedLogins + 1;
      await db.user.update({ where: { id: user.id }, data: { failedLogins: failed, lockedUntil: failed >= MAX_FAILURES ? new Date(Date.now() + LOCK_MS) : null } });
    }
    await audit({
      actor: user ? { id: user.id, role: user.role } : null, action: "LOGIN_FAILURE", outcome: "FAILURE", ipHash: meta.ipHash,
      metadata: { reason: !user ? "unknown_account" : locked ? "locked" : !user.isActive ? "inactive" : "bad_password", emailHash: keyedHash("email", email) },
    });
    return { error: GENERIC };
  }

  await destroyCurrentSession("replaced_by_new_login"); // never reuse an existing session id
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit({ actor: user, action: "LOGIN_SUCCESS", institutionId: user.institutionId, ipHash: meta.ipHash });
  redirect(ROLE_META[user.role].home);
}

export async function logoutAction(): Promise<void> {
  const user = await getAuth();
  const meta = await clientMeta();
  await destroyCurrentSession("logout");
  if (user) await audit({ actor: user, action: "LOGOUT", institutionId: user.institutionId, ipHash: meta.ipHash });
  redirect("/login");
}
