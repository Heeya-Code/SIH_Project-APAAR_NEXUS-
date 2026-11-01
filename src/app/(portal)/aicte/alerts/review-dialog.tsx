// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, RefreshCw } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const CHOICES = [["UNDER_REVIEW", "Mark as under review", "I am looking into it."], ["CONFIRMED", "Confirm, action needed", "This is a real problem the institution must fix."], ["DISMISSED", "Dismiss, not a problem", "There is a legitimate explanation."]] as const;

export function ReviewDialog({ type, id, title }: { type: "anomaly" | "conflict"; id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [status, setStatus] = useState<(typeof CHOICES)[number][0]>("UNDER_REVIEW"), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  async function save() {
    if (status !== "UNDER_REVIEW" && note.trim().length < 5) return setErr("Add a short note explaining your decision (at least a few words). It is kept in the record.");
    setBusy(true); setErr(null);
    const r = await fetch("/api/v1/alerts/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, id, status, note }) });
    const j = await r.json(); setBusy(false);
    if (j.ok) { toast.success("Decision recorded"); setOpen(false); setNote(""); router.refresh(); } else setErr(j.error?.message ?? "Could not save.");
  }
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild><Button variant="secondary" size="sm"><ClipboardCheck aria-hidden />Review</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Review this alert</AlertDialogTitle>
        <AlertDialogDescription>{title}. Your decision and note are recorded with your name and the time. Nothing here is a finding of wrongdoing.</AlertDialogDescription>
        <fieldset className="mt-4 space-y-2"><legend className="sr-only">Decision</legend>
          {CHOICES.map(([v, label, help]) => <label key={v} className="flex cursor-pointer items-start gap-3 rounded-control border border-line px-3 py-2.5 has-[:checked]:border-navy-900 has-[:checked]:bg-paper"><input type="radio" name={`d-${id}`} checked={status === v} onChange={() => setStatus(v)} className="mt-1" /><span><span className="block text-sm font-medium text-navy-900">{label}</span><span className="block text-xs text-slate-600">{help}</span></span></label>)}
        </fieldset>
        <label htmlFor={`n-${id}`} className="mt-4 block text-[13px] font-medium text-navy-900">Note</label>
        <textarea id={`n-${id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} className="mt-1.5 w-full rounded-control border border-line-strong bg-white px-3 py-2 text-sm" placeholder="For example: asked the institution to confirm the transfer" />
        {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" aria-hidden />}Save decision</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RefreshAnalysis() {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  return <Button variant="secondary" disabled={busy} onClick={async () => { setBusy(true); const r = await fetch("/api/v1/analysis/refresh", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); const j = await r.json(); setBusy(false); if (j.ok) { toast.success(`Analysis refreshed: ${j.data.alertsCreated} new alerts, ${j.data.conflictsCreated} new conflicts.`); router.refresh(); } else toast.error(j.error?.message ?? "Could not refresh."); }}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}Re-run analysis</Button>;
}
