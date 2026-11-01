// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { ROLE_META } from "@/lib/auth/permissions";

export const metadata = { title: "Not permitted" };

export default async function Forbidden() {
  const user = await requireUser();
  return (
    <div className="mx-auto mt-14 max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-amber-100 text-amber-700"><LockKeyhole className="size-6" aria-hidden /></span>
      <h1 className="text-2xl text-navy-900">This page isn’t available to your role</h1>
      <p className="mt-2 text-sm text-slate-600">You’re signed in as {ROLE_META[user.role].label}. The attempt has been recorded in the audit trail.</p>
      <Button asChild className="mt-6"><Link href={ROLE_META[user.role].home}>Go to your workspace</Link></Button>
    </div>
  );
}
