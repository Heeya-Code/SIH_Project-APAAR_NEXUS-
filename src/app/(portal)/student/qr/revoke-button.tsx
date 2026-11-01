// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function RevokeButton({ id, reference }: { id: string; reference: string }) {
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-100 hover:text-red-700"><Undo2 aria-hidden />Withdraw consent</Button></AlertDialogTrigger>
      <AlertDialogContent><AlertDialogTitle>Withdraw consent for {reference}?</AlertDialogTitle><AlertDialogDescription>The verification code and QR stop working immediately. The requester is told. The request and your withdrawal stay in your consent history.</AlertDialogDescription>
        <AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={async () => { const r = await fetch("/api/v1/consent/revoke", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); const j = await r.json(); if (j.ok) { toast.success("Consent withdrawn. The code no longer works."); router.refresh(); } else toast.error(j.error?.message ?? "Could not withdraw."); }}>Withdraw consent</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  );
}
