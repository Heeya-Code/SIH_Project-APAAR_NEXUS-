// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { PortalShell } from "@/components/portal-shell";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <PortalShell user={user}>{children}</PortalShell>;
}
