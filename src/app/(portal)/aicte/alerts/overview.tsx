// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Image 7 and 8's control-room strip: how many issues, how severe, and of what kind. Counts come from the same queries as the lists below.
import { TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";

const LABEL: Record<string, string> = { INTAKE_OVERSHOOT: "Above approved intake", ENROLMENT_SPIKE: "Enrolment spike", BULK_SUBMISSION: "Large bulk file", MISSING_ID_RATE: "Many missing IDs", STATISTICAL_OUTLIER: "Statistical outlier", EXACT_APAAR: "Same ID, same person", CONFLICTING_IDENTITY: "Same ID, different details", POTENTIAL_MATCH: "Possible match", WITHIN_INSTITUTION: "Entered twice" };
const kindLabel = (k: string) => (k.startsWith("SUPERNUMERARY_SPIKE") ? `${k.split(":")[1] ?? ""} admissions spike` : k.startsWith("CATEGORY_SKEW") ? `${k.split(":")[1] ?? ""} share unusual` : LABEL[k] ?? k.replaceAll("_", " ").toLowerCase());

export function AlertsOverview({ anomalies, conflicts, bySeverity, byKind, conflictsByKind }: { anomalies: number; conflicts: number; bySeverity: Record<string, number>; byKind: Record<string, number>; conflictsByKind: Record<string, number> }) {
  const total = anomalies + conflicts, sev = [["High", bySeverity.HIGH ?? 0, "bg-red-600 shadow-[0_0_14px_rgba(255,92,80,0.8)]"], ["Medium", bySeverity.MEDIUM ?? 0, "bg-amber-600 shadow-[0_0_14px_rgba(247,176,56,0.7)]"], ["Low", bySeverity.LOW ?? 0, "bg-blue-600 shadow-[0_0_14px_rgba(96,140,255,0.7)]"]] as const;
  const kinds = [...Object.entries(byKind), ...Object.entries(conflictsByKind)].sort((a, b) => b[1] - a[1]).slice(0, 5), max = Math.max(...kinds.map((k) => k[1]), 1);
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      <Card data-tilt className="fade-up flex items-center gap-4 p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-[0_0_30px_-6px_rgba(247,176,56,0.55)]"><TriangleAlert className="size-7" aria-hidden /></span>
        <div><p className="num text-[34px] leading-none text-navy-900">{total}</p><p className="mt-1 text-[14px] text-slate-600">{total === 1 ? "issue needs" : "issues need"} attention</p><p className="text-xs text-slate-500">{anomalies} unusual patterns · {conflicts} possible double enrolments</p></div>
      </Card>
      <Card className="fade-up p-5"><p className="text-[13px] font-medium text-navy-900">By severity (unusual patterns)</p>
        <ul className="mt-3 space-y-2.5">{sev.map(([l, n, dot]) => <li key={l} className="flex items-center gap-3 text-sm"><span aria-hidden className={`size-2.5 rounded-full ${dot}`} /><span className="w-16 text-slate-600">{l}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><span className={`bar-grow block h-full rounded-full ${dot.split(" ")[0]}`} style={{ width: `${anomalies ? (n / anomalies) * 100 : 0}%` }} /></span><span className="tnum w-6 text-right text-navy-900">{n}</span></li>)}</ul></Card>
      <Card className="fade-up p-5"><p className="text-[13px] font-medium text-navy-900">By type</p>
        {kinds.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nothing open.</p> : <ul className="mt-3 space-y-2">{kinds.map(([k, n]) => <li key={k} className="flex items-center gap-3 text-[13px]"><span className="w-40 shrink-0 truncate text-slate-600" title={kindLabel(k)}>{kindLabel(k)}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-line"><span className="bar-grow block h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500" style={{ width: `${(n / max) * 100}%` }} /></span><span className="tnum w-6 text-right text-navy-900">{n}</span></li>)}</ul>}</Card>
    </div>
  );
}
