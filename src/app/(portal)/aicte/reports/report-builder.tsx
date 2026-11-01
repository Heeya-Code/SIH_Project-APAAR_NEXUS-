// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACADEMIC_YEARS, CURRENT_AY } from "@/lib/years";

const KINDS = [
  { v: "seat", label: "Live seat ledger (CSV)", help: "Approved intake, seats filled, seats remaining and any overshoot, for every programme." },
  { v: "trust", label: "Institution Trust Scores (CSV)", help: "Each institution's score, band and component scores, with the weights used. A prototype metric, not an official rating." },
  { v: "institution", label: "One institution (PDF)", help: "A shareable summary: Trust Score and reasons, seat ledger and alerts." },
] as const;
const sel = "mt-1.5 block h-10 w-full max-w-sm rounded-control border border-line-strong bg-white px-3 text-sm";

export function ReportBuilder({ institutions, regions }: { institutions: { id: string; name: string }[]; regions: { value: string; label: string }[] }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]["v"]>("seat"), [ay, setAy] = useState(CURRENT_AY), [region, setRegion] = useState(""), [inst, setInst] = useState(institutions[0]?.id ?? "");
  const href = kind === "seat" ? `/api/v1/reports/seat-ledger?ay=${ay}${region ? `&region=${region}` : ""}` : kind === "trust" ? `/api/v1/reports/trust?ay=${ay}` : `/api/v1/reports/institution/${inst}?ay=${ay}`;
  return (
    <div className="space-y-5">
      <fieldset><legend className="text-[13px] font-medium text-navy-900">Report</legend><div className="mt-2 space-y-2">{KINDS.map((k) => <label key={k.v} className="flex cursor-pointer items-start gap-3 rounded-control border border-line px-3 py-2.5 has-[:checked]:border-navy-900 has-[:checked]:bg-paper"><input type="radio" name="kind" checked={kind === k.v} onChange={() => setKind(k.v)} className="mt-1" /><span><span className="block text-sm font-medium text-navy-900">{k.label}</span><span className="block text-xs text-slate-600">{k.help}</span></span></label>)}</div></fieldset>
      <div><label htmlFor="r-ay" className="text-[13px] font-medium text-navy-900">Academic year</label><select id="r-ay" value={ay} onChange={(e) => setAy(e.target.value)} className={sel}>{ACADEMIC_YEARS.map((y) => <option key={y}>{y}</option>)}</select></div>
      {kind === "seat" && regions.length > 1 && <div><label htmlFor="r-region" className="text-[13px] font-medium text-navy-900">Region</label><select id="r-region" value={region} onChange={(e) => setRegion(e.target.value)} className={sel}><option value="">All regions</option>{regions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>}
      {kind === "institution" && <div><label htmlFor="r-inst" className="text-[13px] font-medium text-navy-900">Institution</label><select id="r-inst" value={inst} onChange={(e) => setInst(e.target.value)} className={sel}>{institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>}
      <Button asChild size="lg"><a href={href} download><Download aria-hidden />Download report</a></Button>
    </div>
  );
}
