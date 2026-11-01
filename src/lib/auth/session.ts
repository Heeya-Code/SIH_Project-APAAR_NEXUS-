// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { keyedHash, randomToken, sha256Hex } from "@/lib/crypto";
import type { Actor } from "./permissions";

// Server-side sessions: the cookie carries a random token; only its SHA-256 is stored.
// Revocation is therefore immediate (unlike stateless JWTs).
// Secure cookies (with the __Host- prefix) are the default in production builds.
// Set INSECURE_COOKIES=1 ONLY for plain-HTTP LAN demos (e.g. Safari, which rejects Secure cookies on http).
const SECURE_COOKIES = process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1";
export const SESSION_COOKIE = SECURE_COOKIES ? "__Host-nexus_session" : "nexus_session";
const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const IDLE_MS = 60 * 60 * 1000;
const TOUCH_EVERY_MS = 60 * 1000;

export type AuthUser = Actor & {
  email: string;
  name: string;
  institutionName: string | null;
  organisation: string | null;
  sessionId: string;
};

export async function clientMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return { ip, ipHash: keyedHash("ip", ip), userAgent: (h.get("user-agent") ?? "").slice(0, 200) };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const meta = await clientMeta();
  const expiresAt = new Date(Date.now() + ABSOLUTE_MS);
  await db.session.create({
    data: { userId, tokenHash: sha256Hex(token), expiresAt, ipHash: meta.ipHash, userAgent: meta.userAgent },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: SECURE_COOKIES, path: "/", expires: expiresAt,
  });
}

/** Resolves the current user from the cookie. Cached per request. Returns null if anything is invalid. */
export const getAuth = cache(async (): Promise<AuthUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: { include: { institution: { select: { name: true } } } } },
  });
  if (!session || session.revokedAt) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || now - session.lastSeenAt.getTime() > IDLE_MS) return null;
  const u = session.user;
  if (!u.isActive) return null;
  if (now - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return {
    id: u.id, role: u.role, institutionId: u.institutionId, region: u.region, studentId: u.studentId,
    email: u.email, name: u.name, institutionName: u.institution?.name ?? null, organisation: u.organisation,
    sessionId: session.id,
  };
});

export async function destroyCurrentSession(reason: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.updateMany({ where: { tokenHash: sha256Hex(token), revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function revokeUserSessions(userId: string, reason: string): Promise<number> {
  const r = await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
  return r.count;
}
