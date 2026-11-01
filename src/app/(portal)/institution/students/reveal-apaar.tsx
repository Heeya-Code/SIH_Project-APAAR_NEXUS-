// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { revealApaarAction } from "@/lib/actions/platform";

export function RevealApaar({ studentId, masked }: { studentId: string; masked: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const hide = () => setValue(null);
  const reveal = () => start(async () => {
    const r = await revealApaarAction(studentId);
    if (r.value) { setValue(r.value); setError(null); setTimeout(hide, 15_000); } else setError(r.error ?? "Could not reveal.");
  });
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-[13px] text-navy-900">{value ?? masked}</span>
      {masked !== "Not provided" && !value && (
        <button type="button" onClick={reveal} disabled={pending} aria-label="Reveal APAAR ID" className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-100 disabled:opacity-60">
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}{pending ? "Revealing" : "Reveal"}
        </button>
      )}
      {value && <button type="button" onClick={hide} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-slate-500 hover:bg-navy-900/5"><EyeOff className="size-3.5" aria-hidden />Hide</button>}
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
