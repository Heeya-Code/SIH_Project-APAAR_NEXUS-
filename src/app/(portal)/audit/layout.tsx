// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { requireAnyPermission } from "@/lib/auth/guards";

// Guard sits above this route's loading.tsx so a denial is a real redirect (see guards.ts).
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAnyPermission(["audit:view:all", "audit:view:institution"]);
  return children;
}
