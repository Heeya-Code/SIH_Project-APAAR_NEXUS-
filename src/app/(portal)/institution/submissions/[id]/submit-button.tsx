// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function SubmitButton({ submissionId, ready, held, flagged }: { submissionId: string; ready: number; held: number; flagged: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const r = await fetch("/api/v1/submissions/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ submissionId }) });
      const j = await r.json();
      if (j.ok) { toast.success(`${j.data.accepted} records submitted.${j.data.held ? ` ${j.data.held} are waiting for correction.` : " Everything is now with AICTE."}`); router.refresh(); }
      else toast.error(j.error?.message ?? "Submission failed.");
    } catch { toast.error("We could not reach the server. Nothing was submitted."); }
    finally { setBusy(false); }
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button size="lg" disabled={busy || ready === 0}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}Submit {ready} valid rows</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Submit {ready} records to AICTE?</AlertDialogTitle>
        <AlertDialogDescription>
          These rows will be stored as enrolments. {held ? `${held} rows with errors will stay on hold: nothing is deleted, and you can fix them and upload a corrected file. ` : ""}{flagged ? `${flagged} of the rows being submitted are flagged for AICTE review (for example an overlap with another institution). That is a question, not an accusation. ` : ""}This cannot be undone, but it is safe to upload a corrected file afterwards.
        </AlertDialogDescription>
        <AlertDialogFooter><AlertDialogCancel>Not yet</AlertDialogCancel><AlertDialogAction variant="default" onClick={go}>Yes, submit them</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
