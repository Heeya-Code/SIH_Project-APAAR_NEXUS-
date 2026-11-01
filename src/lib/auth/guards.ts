// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import "server-only";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { can, type Permission } from "./permissions";

export const GUARD_NOTE = "Route layouts call these guards ABOVE each route's loading.tsx boundary so a denial is a real HTTP redirect; pages call them again (defence in depth).";
import { getAuth, type AuthUser } from "./session";

export async function requireUser(): Promise<AuthUser> {
  const user = await getAuth();
  if (!user) redirect("/login");
  return user;
}

/** Page-level guard. Denials are audited, then the user lands on /forbidden. */
export async function requirePermission(perm: Permission): Promise<AuthUser> {
  const user = await requireUser();
  if (!can(user.role, perm)) {
    await audit({ actor: user, action: "ACCESS_DENIED", outcome: "DENIED", institutionId: user.institutionId, metadata: { permission: perm } });
    redirect("/forbidden");
  }
  return user;
}

/** For server actions: throws instead of redirecting. Actions are public endpoints, always re-check. */
export async function assertPermission(perm: Permission): Promise<AuthUser> {
  const user = await getAuth();
  if (!user) throw new Error("Not signed in");
  if (!can(user.role, perm)) {
    await audit({ actor: user, action: "ACCESS_DENIED", outcome: "DENIED", institutionId: user.institutionId, metadata: { permission: perm, via: "action" } });
    throw new Error("Not permitted");
  }
  return user;
}

/** Passes if the user holds ANY of the permissions (e.g. audit: all-institutions or own-institution). */
export async function requireAnyPermission(perms: Permission[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!perms.some((p) => can(user.role, p))) {
    await audit({ actor: user, action: "ACCESS_DENIED", outcome: "DENIED", institutionId: user.institutionId, metadata: { permission: perms.join("|") } });
    redirect("/forbidden");
  }
  return user;
}
