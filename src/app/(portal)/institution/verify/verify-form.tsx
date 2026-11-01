// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, CircleHelp, Hourglass, Loader2, ShieldQuestion, type LucideIcon } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Result = { status: "VERIFIED" | "INVALID" | "PENDING" | "UNAVAILABLE"; reasonCode: string; message: string; authoritative: boolean; requestId: string;
  provider: { name: string; mode: string }; matched?: { name?: boolean; dateOfBirth?: boolean } };
const META: Record<Result["status"], { tone: Tone; icon: LucideIcon; bar: string }> = {
  VERIFIED: { tone: "green", icon: CircleCheck, bar: "bg-green-600" }, INVALID: { tone: "red", icon: CircleAlert, bar: "bg-red-600" },
  PENDING: { tone: "blue", icon: Hourglass, bar: "bg-blue-600" }, UNAVAILABLE: { tone: "amber", icon: CircleHelp, bar: "bg-amber-600" },
};
const input = "h-10 w-full rounded-control border border-line-strong bg-white px-3 text-[15px] placeholder:text-slate-500";

export function VerifyForm() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, string> = { apaarId: String(f.get("apaarId") ?? "") };
    for (const k of ["fullName", "dateOfBirth"]) { const v = String(f.get(k) ?? "").trim(); if (v) body[k] = v; }
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await fetch("/api/v1/verification/apaar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.ok) setResult(j.data);
      else setError(j.error?.details ? `${j.error.message} ${j.error.details.map((d: { message: string }) => d.message).join(" ")}` : j.error?.message ?? "Request failed.");
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  const m = result ? META[result.status] : null;
  const Icon = m?.icon;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form onSubmit={submit} className="space-y-4 rounded-card border border-line bg-white p-5 shadow-card">
        <div><label htmlFor="apaarId" className="mb-1.5 block text-[13px] font-medium text-navy-900">APAAR ID</label><input id="apaarId" name="apaarId" required autoComplete="off" inputMode="numeric" className={`${input} font-mono`} /></div>
        <div><label htmlFor="fullName" className="mb-1.5 block text-[13px] font-medium text-navy-900">Full name <span className="font-normal text-slate-500">(optional, compared if given)</span></label><input id="fullName" name="fullName" autoComplete="off" className={input} /></div>
        <div><label htmlFor="dateOfBirth" className="mb-1.5 block text-[13px] font-medium text-navy-900">Date of birth <span className="font-normal text-slate-500">(optional)</span></label><input id="dateOfBirth" name="dateOfBirth" type="date" className={input} /></div>
        <Button type="submit" disabled={busy} className="w-full" size="lg">{busy ? <><Loader2 className="animate-spin" aria-hidden />Checking</> : "Check APAAR ID"}</Button>
      </form>
      <div aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {error && <motion.p key="err" role="alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="rounded-card bg-red-100 px-4 py-3 text-sm text-red-700">{error}</motion.p>}
          {!error && !result && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-card border border-dashed border-line-strong bg-paper/60 p-6 text-center">
              <span className="mb-3 grid size-10 place-items-center rounded-full bg-white text-slate-500 shadow-card"><ShieldQuestion className="size-5" aria-hidden /></span>
              <p className="font-medium text-navy-900">No check run yet</p><p className="mt-1 max-w-xs text-sm text-slate-500">The result appears here with the reason and whether it is authoritative.</p>
            </motion.div>
          )}
          {result && m && Icon && (
            <motion.div key={result.requestId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Card className="overflow-hidden">
                <div className={`h-1 ${m.bar}`} />
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center gap-3"><Icon className="size-6 text-navy-900" aria-hidden /><Badge tone={m.tone}>{result.status}</Badge><span className="font-mono text-xs text-slate-500">{result.reasonCode}</span></div>
                  <p className="text-[15px] leading-relaxed text-navy-900">{result.message}</p>
                  {result.matched && <p className="text-sm text-slate-600">{[result.matched.name !== undefined && `Name ${result.matched.name ? "matches" : "does not match"}`, result.matched.dateOfBirth !== undefined && `Date of birth ${result.matched.dateOfBirth ? "matches" : "does not match"}`].filter(Boolean).join(" · ")}</p>}
                  <div className={`rounded-lg px-3.5 py-2.5 text-sm ${result.authoritative ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {result.authoritative ? "Authoritative result from an authorised provider." : "Not authoritative. This result does not confirm the student with the official APAAR system."}
                  </div>
                  <p className="text-xs text-slate-500">Provider: {result.provider.name} ({result.provider.mode.toLowerCase()}) · Request <span className="font-mono">{result.requestId}</span></p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
