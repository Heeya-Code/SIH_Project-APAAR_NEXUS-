// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useState, useTransition } from "react";
import { CircleAlert, CircleCheck, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyAuditChainAction } from "@/lib/actions/platform";

export function VerifyChain() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {msg && <p role="status" className={`flex items-center gap-1.5 text-[13px] ${msg.ok ? "text-green-700" : "font-medium text-red-700"}`}>{msg.ok ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}{msg.text}</p>}
      <Button disabled={pending} onClick={() => start(async () => { const r = await verifyAuditChainAction(); setMsg(r.ok ? { ok: true, text: `Chain intact: ${r.checked.toLocaleString("en-IN")} records verified.` } : { ok: false, text: `Chain broken at record ${r.brokenAtSeq}: ${r.reason}` }); })}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}{pending ? "Verifying" : "Verify audit chain"}
      </Button>
    </div>
  );
}
