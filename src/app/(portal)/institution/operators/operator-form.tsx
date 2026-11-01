// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const field = "h-10 w-full rounded-control border border-line-strong bg-white px-3 text-[15px]";
export function OperatorForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError(null);
    const r = await fetch("/api/v1/operators", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: String(f.get("name")), email: String(f.get("email")) }) });
    const j = await r.json(); setBusy(false);
    if (j.ok) { setCreated({ email: j.data.email, password: j.data.temporaryPassword }); toast.success("Operator created."); (e.target as HTMLFormElement).reset(); router.refresh(); }
    else setError(j.error?.details ? j.error.details.map((d: { message: string }) => d.message).join(" ") : j.error?.message ?? "Could not create the operator.");
  }
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="name" className="mb-1.5 block text-[13px] font-medium text-navy-900">Full name</label><input id="name" name="name" required minLength={2} className={field} autoComplete="off" /></div>
        <div><label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-navy-900">Work email</label><input id="email" name="email" type="email" required className={field} autoComplete="off" /></div>
        {error && <p role="alert" className="rounded-control bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />}Create operator</Button>
      </form>
      {created && (
        <div role="status" className="rounded-control border border-teal-600/30 bg-teal-100/50 p-4 text-sm">
          <p className="font-medium text-navy-900">Account created for {created.email}</p>
          <p className="mt-1 text-slate-600">Temporary password (shown only now):</p>
          <p className="mt-1 flex items-center gap-2"><code className="rounded bg-white px-2 py-1 font-mono text-[13px]">{created.password}</code>
            <Button type="button" size="sm" variant="secondary" onClick={() => { void navigator.clipboard.writeText(created.password); toast.success("Copied"); }}><Copy aria-hidden />Copy</Button></p>
        </div>
      )}
    </div>
  );
}
