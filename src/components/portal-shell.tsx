// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { AppShell } from "@/components/shell/app-shell";
import { navFor } from "@/components/nav";
import { can, REGION_LABEL, ROLE_META } from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

function scopeLabel(u: AuthUser) {
  if (u.institutionName) return u.institutionName;
  if (u.region) return `${REGION_LABEL[u.region]} region`;
  if (u.organisation) return u.organisation;
  return u.role === "STUDENT" ? "Own record only" : "National";
}
const initials = (name: string) => name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export async function PortalShell({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const meta = ROLE_META[user.role];
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <AppShell national={can(user.role, "national:view")} user={{ name: user.name, email: user.email, roleLabel: meta.label, scope: scopeLabel(user), initials: initials(user.name), unread }} nav={navFor(user.role)} home={meta.home}>
      {children}
    </AppShell>
  );
}
