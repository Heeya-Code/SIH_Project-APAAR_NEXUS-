// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { ROLE_META } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const user = await requireUser();
  redirect(ROLE_META[user.role].home);
}
