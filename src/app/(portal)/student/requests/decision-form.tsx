// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type F = { key: string; label: string; plain: string; personal: boolean };
export function DecisionForm({ id, org, fields }: { id: string; org: string; fields: F[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>(fields.filter((f) => !f.personal).map((f) => f.key)), [days, setDays] = useState(7), [busy, setBusy] = useState(false), [open, setOpen] = useState(false), [note, setNote] = useState("");
  const toggle = (k: string) => setChosen((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  async function send(decision: "APPROVE" | "REJECT") {
    setBusy(true);
    const r = await fetch("/api/v1/consent/decision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(decision === "APPROVE" ? { id, decision, fields: chosen, validDays: days } : { id, decision, note }) });
    const j = await r.json(); setBusy(false);
    if (j.ok) { toast.success(decision === "APPROVE" ? "Approved. Your verification record and QR code are ready." : "Request declined. Nothing was shared."); setOpen(false); router.push(decision === "APPROVE" ? "/student/qr" : "/student/consents"); router.refresh(); } else toast.error(j.error?.message ?? "Could not save your decision.");
  }
  return (
    <div className="mt-5 space-y-4 border-t border-line pt-5">
      <fieldset><legend className="text-[13px] font-medium text-navy-900">Choose what to share ({chosen.length} of {fields.length})</legend>
        <ul className="mt-2 space-y-2">{fields.map((f) => <li key={f.key}><label className="flex cursor-pointer items-start gap-3 rounded-control border border-line px-3 py-2.5 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-100/30"><input type="checkbox" checked={chosen.includes(f.key)} onChange={() => toggle(f.key)} className="mt-1 size-4" /><span className="min-w-0"><span className="flex items-center gap-2 text-sm font-medium text-navy-900">{f.label}{f.personal && <Badge tone="amber"><ShieldAlert className="size-3" aria-hidden />Personal</Badge>}</span><span className="block text-xs text-slate-600">{f.plain}</span></span></label></li>)}</ul>
      </fieldset>
      <div><label htmlFor={`days-${id}`} className="text-[13px] font-medium text-navy-900">How long can they rely on it?</label>
        <select id={`days-${id}`} value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-1.5 block h-10 rounded-control border border-line-strong bg-white px-3 text-sm"><option value={1}>1 day</option><option value={7}>7 days</option><option value={30}>30 days</option></select>
        <p className="mt-1 text-xs text-slate-500">You can withdraw consent at any time and the record stops working immediately.</p></div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy || chosen.length === 0} onClick={() => send("APPROVE")}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}Approve and share {chosen.length} item{chosen.length === 1 ? "" : "s"}</Button>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild><Button variant="secondary" disabled={busy}><X aria-hidden />Decline</Button></AlertDialogTrigger>
          <AlertDialogContent><AlertDialogTitle>Decline this request?</AlertDialogTitle><AlertDialogDescription>{org} will be told you declined. Nothing about you is shared. The decision is kept in your consent history.</AlertDialogDescription>
            <label htmlFor={`note-${id}`} className="mt-4 block text-[13px] font-medium text-navy-900">Reason (optional)</label><textarea id={`note-${id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} className="mt-1.5 w-full rounded-control border border-line-strong px-3 py-2 text-sm" />
            <AlertDialogFooter><AlertDialogCancel disabled={busy}>Go back</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={() => send("REJECT")}>Yes, decline</Button></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </div>
      {chosen.length === 0 && <p className="text-xs text-slate-500">Select at least one item to approve, or decline the request.</p>}
    </div>
  );
}
