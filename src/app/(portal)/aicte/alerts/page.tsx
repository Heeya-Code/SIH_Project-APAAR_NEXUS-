// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { dateTime } from "@/lib/format";
import { alertCounts, getAnomalies, getConflicts, type AnomalyExplanation, type ConflictEvidence } from "@/lib/queries/alerts";
import { cn } from "@/lib/utils";
import { RefreshAnalysis, ReviewDialog } from "./review-dialog";
import { AlertsOverview } from "./overview";

export const metadata = { title: "Alerts and conflicts" };
export const dynamic = "force-dynamic";
const KIND: Record<string, { label: string; plain: string }> = {
  EXACT_APAAR: { label: "Same APAAR ID, same person", plain: "The same student seems to be enrolled at two institutions." }, CONFLICTING_IDENTITY: { label: "Same APAAR ID, different details", plain: "One APAAR ID is on two records with different names or dates of birth." },
  POTENTIAL_MATCH: { label: "Possible match", plain: "Similar name and the same date of birth, but the APAAR IDs differ or one is missing." }, WITHIN_INSTITUTION: { label: "Entered twice at one institution", plain: "The same APAAR ID is on two records at the same institution." },
};
const STATUS: Record<string, { label: string; tone: "amber" | "blue" | "red" | "green" }> = { OPEN: { label: "Open", tone: "amber" }, UNDER_REVIEW: { label: "Under review", tone: "blue" }, CONFIRMED: { label: "Confirmed, action needed", tone: "red" }, DISMISSED: { label: "Dismissed", tone: "green" } };
const SEV = { LOW: "blue", MEDIUM: "amber", HIGH: "red", CRITICAL: "red" } as const;
const DETECTOR: Record<string, string> = { RULE_BASED_v1: "Rule-based check", ISOLATION_FOREST_v1: "Statistical screening (Isolation Forest)" };

export default async function Alerts({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; severity?: string; kind?: string }> }) {
  const user = await requirePermission("alerts:view");
  const sp = await searchParams, tab = sp.tab === "conflicts" ? "conflicts" : "anomalies", status = sp.status === "all" ? "all" : "open";
  const severity = ["LOW", "MEDIUM", "HIGH"].includes(sp.severity ?? "") ? sp.severity : undefined, kind = Object.keys(KIND).includes(sp.kind ?? "") ? sp.kind : undefined;
  const [counts, anomalies, conflicts] = await Promise.all([alertCounts(user), tab === "anomalies" ? getAnomalies(user, { status, severity }) : [], tab === "conflicts" ? getConflicts(user, { status, kind }) : []]);
  const canReview = can(user.role, "alerts:review");
  const href = (o: Record<string, string | undefined>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ tab, status, severity, kind, ...o })) if (v) p.set(k, v); return `/aicte/alerts?${p}`; };
  const chip = (on: boolean) => cn("rounded-full border px-3 py-1 text-[13px]", on ? "border-navy-900 bg-navy-900 text-white" : "border-line-strong bg-white text-slate-600 hover:bg-paper");
  return (
    <>
      <PageHeader title="Alerts and conflicts" subtitle="Unusual patterns and possible double enrolments, each with the reason it was raised. These are questions for a human, never proof of wrongdoing." actions={canReview ? <RefreshAnalysis /> : undefined} />
      <AlertsOverview anomalies={counts.anomalies} conflicts={counts.conflicts} bySeverity={counts.bySeverity} byKind={counts.byKind} conflictsByKind={counts.conflictsByKind} />
      <nav className="mb-5 flex flex-wrap items-center gap-2" aria-label="Alert filters">
        <Link aria-current={tab === "anomalies" ? "page" : undefined} href={href({ tab: "anomalies", kind: undefined, severity: undefined })} className={chip(tab === "anomalies")}>Unusual patterns ({counts.anomalies})</Link>
        <Link aria-current={tab === "conflicts" ? "page" : undefined} href={href({ tab: "conflicts", kind: undefined, severity: undefined })} className={chip(tab === "conflicts")}>Cross-institution conflicts ({counts.conflicts})</Link>
        <span className="mx-2 hidden h-5 w-px bg-line-strong sm:block" aria-hidden />
        <Link href={href({ status: "open" })} className={chip(status === "open")}>Needs attention</Link><Link href={href({ status: "all" })} className={chip(status === "all")}>Everything, including reviewed</Link>
        {tab === "anomalies" ? (["HIGH", "MEDIUM", "LOW"] as const).map((s) => <Link key={s} href={href({ severity: severity === s ? undefined : s })} className={chip(severity === s)}>{s.charAt(0) + s.slice(1).toLowerCase()} severity</Link>) : Object.entries(KIND).map(([k, v]) => <Link key={k} href={href({ kind: kind === k ? undefined : k })} className={chip(kind === k)}>{v.label}</Link>)}
      </nav>

      {tab === "anomalies" ? (anomalies.length === 0 ? <Empty icon={CheckCircle2} title="No alerts match">Nothing in your scope needs attention with these filters.</Empty> : (
        <ul className="space-y-3">{anomalies.map((a) => { const e = a.explanation as unknown as AnomalyExplanation, st = STATUS[a.status]; return (
          <li key={a.id}><Card className={cn("fade-up p-5", a.severity === "HIGH" ? "glow-red" : a.severity === "MEDIUM" ? "glow-amber" : "glow-blue")}><div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge tone={SEV[a.severity]} dot>{a.severity.charAt(0) + a.severity.slice(1).toLowerCase()}</Badge><Badge tone={st.tone}>{st.label}</Badge><span className="text-xs text-slate-500">{DETECTOR[a.detector] ?? a.detector} · {a.academicYear}</span></div>
              <h2 className="mt-2 font-serif text-[17px] text-navy-900">{e.headline}</h2><p className="text-sm text-slate-600"><Link href={`/aicte/institutions/${a.institution.id}?ay=${a.academicYear}`} className="text-blue-600 underline-offset-2 hover:underline">{a.institution.name}</Link>, {a.institution.stateName}</p></div>
            {canReview && <ReviewDialog type="anomaly" id={a.id} title={e.headline} />}</div>
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3"><div><dt className="text-xs font-medium text-slate-500">What we saw</dt><dd className="mt-1 text-navy-900">{e.observed}</dd></div><div><dt className="text-xs font-medium text-slate-500">Compared with</dt><dd className="mt-1 text-navy-900">{e.comparedWith}</dd></div><div><dt className="text-xs font-medium text-slate-500">Why it matters</dt><dd className="mt-1 text-slate-700">{e.why}</dd></div></dl>
            <p className="mt-4 flex items-start gap-2 rounded-control bg-paper px-3 py-2 text-[13px] text-slate-600"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />{e.caution}</p>
            {a.reviewNote && <p className="mt-3 text-[13px] text-slate-700"><span className="font-medium">Review note:</span> {a.reviewNote}{a.reviewedAt && <span className="text-slate-500"> ({dateTime(a.reviewedAt)})</span>}</p>}</Card></li>); })}</ul>
      )) : (conflicts.length === 0 ? <Empty icon={CheckCircle2} title="No conflicts match">No cross-institution conflicts in your scope need attention with these filters.</Empty> : (
        <ul className="space-y-3">{conflicts.map((c) => { const e = c.evidence as unknown as ConflictEvidence, st = STATUS[c.status], k = KIND[c.kind]; return (
          <li key={c.id}><Card className="fade-up p-5"><div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex flex-wrap items-center gap-2"><Badge tone={c.kind === "POTENTIAL_MATCH" ? "blue" : "amber"} dot>{k.label}</Badge><Badge tone={st.tone}>{st.label}</Badge><span className="font-mono text-xs text-slate-500">ref {c.id.slice(0, 8)}</span></div><p className="mt-2 text-sm text-navy-900">{e.explanation}</p></div>
            {canReview && <ReviewDialog type="conflict" id={c.id} title={k.label} />}</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">{e.sides.map((s, i) => <div key={i} className="rounded-control border border-line bg-paper/60 px-4 py-3 text-sm"><p className="font-medium text-navy-900">{s.institution}</p><p className="text-[13px] text-slate-600">{s.programme}, admitted {s.academicYear}</p><p className="mt-0.5 font-mono text-xs text-slate-500">student reference {s.studentRef}</p></div>)}</div>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-slate-600">What matched: <Badge tone={e.matched.apaarId ? "amber" : "neutral"}>APAAR ID {e.matched.apaarId ? "same" : "differs or missing"}</Badge><Badge tone={e.matched.dateOfBirth ? "amber" : "neutral"}>Date of birth {e.matched.dateOfBirth ? "same" : "differs"}</Badge><Badge tone={e.matched.name === "different" ? "neutral" : "amber"}>Name {e.matched.name} ({Math.round(e.nameSimilarity * 100)}% alike)</Badge></p>
            <p className="mt-3 text-xs text-slate-500">{e.note}</p>
            {c.reviewNote && <p className="mt-3 text-[13px] text-slate-700"><span className="font-medium">Review note:</span> {c.reviewNote}{c.reviewedAt && <span className="text-slate-500"> ({dateTime(c.reviewedAt)})</span>}</p>}</Card></li>); })}</ul>
      ))}
    </>
  );
}
