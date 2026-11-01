// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Renders one institution's Trust Score with every reason visible. A PROTOTYPE metric, never an official rating.
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { TrustTrendChart } from "@/components/charts";
import { Hint } from "@/components/guide/hint";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, Panel } from "@/components/ui";
import { BAND_LABEL, type Band, type TrustResult } from "@/lib/trust/score";
import { cn } from "@/lib/utils";

const TONE: Record<Band, { text: string; stroke: string; badge: "green" | "teal" | "amber" | "red" }> = { STRONG: { text: "text-green-700", stroke: "#1e7b4f", badge: "green" }, GOOD: { text: "text-teal-700", stroke: "#0e8f8a", badge: "teal" }, WATCH: { text: "text-amber-700", stroke: "#b7791f", badge: "amber" }, AT_RISK: { text: "text-red-700", stroke: "#b42318", badge: "red" } };

function Ring({ value, band }: { value: number; band: Band }) {
  const r = 52, c = 2 * Math.PI * r, t = TONE[band];
  return (
    <div className="relative grid size-36 place-items-center" role="img" aria-label={`Trust Score ${value} out of 100, ${BAND_LABEL[band]}`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90"><circle cx="60" cy="60" r={r} fill="none" stroke="#e6edf5" strokeWidth="10" /><circle cx="60" cy="60" r={r} fill="none" stroke={t.stroke} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} /></svg>
      <div className="text-center"><p className={cn("num text-4xl leading-none", t.text)}>{value}</p><p className="mt-1 text-xs text-slate-500">out of 100</p></div>
    </div>
  );
}

export function TrustView({ ay, result, trend, weightSource }: { ay: string; result: TrustResult; trend: { ay: string; overall: number | null }[]; weightSource: string }) {
  const note = (
    <p className="flex items-start gap-2 rounded-control bg-blue-100/60 px-4 py-3 text-[13px] leading-relaxed text-navy-900"><Info className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden />
      <span><strong className="font-medium">A prototype assessment metric.</strong> The Trust Score summarises how reliable an institution's submitted data looks. It is not an AICTE accreditation, approval or rating, and every point can be traced to a measurable fact below. Weights: {weightSource}.</span></p>
  );
  if (!result.scored) return <div className="space-y-6">{note}<Empty title={`No Trust Score for ${ay}`}>{result.reason}</Empty><Panel title="Score history"><TrustTrendChart data={trend} /></Panel></div>;
  const lowering = [...result.components].filter((c) => c.pointsLost >= 0.5).sort((a, b) => b.pointsLost - a.pointsLost), strong = result.components.filter((c) => c.score >= 95);
  return (
    <div className="space-y-6">
      {note}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="fade-up flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left lg:flex-col lg:text-center xl:flex-row xl:text-left">
          <Ring value={result.overall} band={result.band} />
          <div><Badge tone={TONE[result.band].badge} dot>{BAND_LABEL[result.band]}</Badge><p className="mt-3 font-serif text-lg text-navy-900">Trust Score for {ay}</p>
            <p className="mt-1 text-sm text-slate-600">{lowering.length ? `${lowering.length} factor${lowering.length > 1 ? "s" : ""} lowered the score; ${strong.length} ${strong.length === 1 ? "is" : "are"} at full strength.` : "No factor lowered the score."}</p></div>
        </Card>
        <Panel title="Score history"><TrustTrendChart data={trend} /></Panel>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="What lowered the score" description="Largest losses first. Each links to a fix.">
          {lowering.length === 0 ? <p className="text-sm text-slate-600">Nothing lowered the score this year.</p> : <ul className="space-y-3">{lowering.map((c) => <li key={c.key} className="flex gap-3"><ArrowDownRight className="mt-0.5 size-4 shrink-0 text-red-700" aria-hidden /><div><p className="text-sm text-navy-900"><span className="font-medium">{c.label}</span> <span className="text-red-700">−{c.pointsLost} points</span></p><p className="text-[13px] text-slate-600">{c.detail}</p>{c.recommendation && <p className="mt-0.5 text-[13px] text-navy-900"><span className="font-medium">To improve: </span>{c.recommendation}</p>}</div></li>)}</ul>}
        </Panel>
        <Panel title="What is working well">
          {strong.length === 0 ? <p className="text-sm text-slate-600">No factor is at full strength yet.</p> : <ul className="space-y-3">{strong.map((c) => <li key={c.key} className="flex gap-3"><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden /><div><p className="text-sm font-medium text-navy-900">{c.label}</p><p className="text-[13px] text-slate-600">{c.detail}</p></div></li>)}</ul>}
        </Panel>
      </div>
      <Panel title="How the score is made up" description="Seven components, each 0 to 100, combined using the weights shown." flush>
        <ul className="divide-y divide-line">{result.components.map((c) => (
          <li key={c.key} className="grid gap-2 px-5 py-4 md:grid-cols-[220px_1fr_auto] md:items-center">
            <p className="text-sm font-medium text-navy-900">{c.label} <Hint text={c.detail} /> <span className="ml-1 text-xs font-normal text-slate-500">weight {c.weight}%</span></p>
            <div className="h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={`${c.score} out of 100`}><div className={cn("bar-grow h-full rounded-full", c.score >= 85 ? "bg-green-600" : c.score >= 50 ? "bg-amber-600" : "bg-red-600")} style={{ width: `${c.score}%` }} /></div>
            <p className="tnum text-right text-sm"><span className="num text-lg text-navy-900">{c.score}</span><span className="text-slate-500"> / 100</span></p>
          </li>))}</ul>
      </Panel>
    </div>
  );
}
