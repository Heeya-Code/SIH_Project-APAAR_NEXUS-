// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Loader2, SendHorizontal, ShieldAlert } from "lucide-react";
import { Hint } from "@/components/guide/hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui";

type F = { key: string; label: string; plain: string; personal: boolean };
const input = "h-11 w-full rounded-control border border-line-strong bg-white px-3.5 text-[15px]";
export function RequestForm({ purposes, fields }: { purposes: string[]; fields: F[] }) {
  const [code, setCode] = useState(""), [purpose, setPurpose] = useState(purposes[0]), [chosen, setChosen] = useState<string[]>(["ENROLMENT_STATUS"]), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [done, setDone] = useState<{ reference: string } | null>(null);
  const toggle = (k: string) => setChosen((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const r = await fetch("/api/v1/consent/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentCode: code, purpose, fields: chosen }) });
    const j = await r.json(); setBusy(false);
    if (j.ok) { setDone({ reference: j.data.reference }); toast.success("Request sent to the student."); } else setError(j.error?.message ?? "Could not send the request.");
  }
  if (done) return (
    <Panel><div className="flex flex-col items-center py-6 text-center"><CheckCircle2 className="size-10 text-green-600" aria-hidden /><h2 className="mt-3 font-serif text-xl text-navy-900">Request sent</h2>
      <p className="mt-1 max-w-md text-sm text-slate-600">The student has been notified. Nothing is shared unless they approve. You will be notified of their answer.</p><p className="mt-3 text-xs text-slate-500">Reference</p><p className="font-mono text-lg text-navy-900">{done.reference}</p>
      <div className="mt-5 flex gap-3"><Button asChild variant="secondary"><Link href="/verifier/history">See request history</Link></Button><Button onClick={() => { setDone(null); setCode(""); }}>Send another</Button></div></div></Panel>
  );
  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-6">
        <Panel title="1. Who do you want to verify?"><label htmlFor="studentCode" className="mb-1.5 block text-[13px] font-medium text-navy-900">Student's verification code <Hint text="The student finds this on their My profile page. It looks like ABCDE-FGHJK. It only lets you send a request." /></label>
          <input id="studentCode" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="ABCDE-FGHJK" autoComplete="off" className={`${input} font-mono tracking-wider`} /></Panel>
        <Panel title="2. Why do you need it?"><label htmlFor="purpose" className="mb-1.5 block text-[13px] font-medium text-navy-900">Purpose <Hint text="The student sees this exactly as you write it. Choose the real reason." /></label>
          <select id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className={input}>{purposes.map((p) => <option key={p}>{p}</option>)}</select></Panel>
        <Panel title="3. What do you need to see?" description="Tick only what is necessary. The student can share less than you ask for, never more.">
          <ul className="space-y-2">{fields.map((f) => <li key={f.key}><label className="flex cursor-pointer items-start gap-3 rounded-control border border-line px-3 py-2.5 has-[:checked]:border-navy-900 has-[:checked]:bg-paper"><input type="checkbox" checked={chosen.includes(f.key)} onChange={() => toggle(f.key)} className="mt-1 size-4" /><span><span className="flex items-center gap-2 text-sm font-medium text-navy-900">{f.label}{f.personal && <Badge tone="amber"><ShieldAlert className="size-3" aria-hidden />Personal</Badge>}</span><span className="block text-xs text-slate-600">{f.plain}</span></span></label></li>)}</ul></Panel>
      </div>
      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Panel title="Review and send"><dl className="space-y-3 text-sm"><div><dt className="text-xs font-medium text-slate-500">Purpose</dt><dd className="mt-0.5 text-navy-900">{purpose}</dd></div><div><dt className="text-xs font-medium text-slate-500">You are asking for</dt><dd className="mt-1 flex flex-wrap gap-1.5">{chosen.length ? chosen.map((k) => <Badge key={k} tone="teal">{fields.find((f) => f.key === k)?.label}</Badge>) : <span className="text-slate-500">Nothing yet</span>}</dd></div></dl>
          {error && <p role="alert" className="mt-4 rounded-control bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" size="lg" disabled={busy || chosen.length === 0 || code.length < 5} className="mt-5 w-full">{busy ? <Loader2 className="animate-spin" aria-hidden /> : <SendHorizontal aria-hidden />}Send request</Button>
          <p className="mt-3 text-xs text-slate-500">Requests lapse after 7 days if unanswered. Every request is recorded.</p></Panel>
      </div>
    </form>
  );
}
