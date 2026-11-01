// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileUp, History, ScanSearch, ShieldCheck, TriangleAlert } from "lucide-react";
import { Hint } from "@/components/guide/hint";
import { Stepper } from "@/components/guide/stepper";
import { SegmentedBar } from "@/components/seat-ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { dateTime, fmt, pct } from "@/lib/format";
import { CATEGORY_HELP, CATEGORY_LABEL, OUTCOME_LABEL, SUBMISSION_STATUS, UPLOAD_STEPS } from "@/lib/labels";
import { getSubmissionDetail } from "@/lib/queries/submissions";
import { cn } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

export const metadata = { title: "Validation results" };
export const dynamic = "force-dynamic";
const PAGE = 25;
type Intake = { programmeName: string; approved: number; alreadyOnFile: number; inThisFile: number; total: number; remaining: number; overshoot: number; utilisation: number };
type Cap = { name: string; count: number; allowed: number; excess: number; maxPercent: number };
type Apaar = { formatValid: number; formatInvalid: number; missing: number; mockVerified: number; pending: number; unavailable: number };

export default async function SubmissionResults({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cat?: string; outcome?: string; page?: string }> }) {
  const user = await requirePermission("submissions:view");
  const { id } = await params, sp = await searchParams;
  const cat = ["DUPLICATE", "APAAR", "INTAKE", "DATA", "CROSS_INSTITUTION"].includes(sp.cat ?? "") ? sp.cat : undefined;
  const outcome = ["VALID", "WARNING", "REQUIRES_REVIEW", "REJECTED"].includes(sp.outcome ?? "") ? sp.outcome : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const d = await getSubmissionDetail(user, id, { category: cat, outcome, page, pageSize: PAGE });
  if (!d) notFound();
  const { sub, rows, total, chain, subIssues, held, notes } = d;
  const rbc = (notes.rowsByCategory ?? {}) as Record<string, number>, apaar = (notes.apaar ?? {}) as Apaar, intake = (notes.intake ?? []) as Intake[], caps = (notes.caps ?? []) as Cap[], skipped = Number(notes.skipped ?? 0);
  const st = SUBMISSION_STATUS[sub.status], submitted = !!sub.submittedAt;
  const ready = await import("@/lib/db").then(({ db }) => db.stagedRecord.count({ where: { submissionId: id, disposition: "PENDING", NOT: { outcome: "REJECTED" } } }));
  const step = submitted ? 8 : held > 0 ? 6 : 7;
  const overSeats = intake.reduce((t, l) => t + l.overshoot, 0);
  const qs = (o: Record<string, string | undefined>) => { const p = new URLSearchParams(); const m = { cat, outcome, ...o }; for (const [k, v] of Object.entries(m)) if (v) p.set(k, v); return `?${p}`; };
  const cards: { key: string; label: string; value: number; tone: string; cat?: string; outcome?: string; hint: string }[] = [
    { key: "total", label: "Total records checked", value: sub.rowCount, tone: "text-navy-900", hint: "Every row in your file." },
    { key: "valid", label: "Valid", value: sub.validCount, tone: "text-green-700", outcome: "VALID", hint: "Passed every check." },
    { key: "bad", label: "Must be corrected", value: sub.rejectedCount, tone: sub.rejectedCount ? "text-red-700" : "text-navy-900", outcome: "REJECTED", hint: "Held back until you fix them. Nothing is deleted." },
    { key: "dup", label: CATEGORY_LABEL.DUPLICATE, value: rbc.DUPLICATE ?? 0, tone: "text-navy-900", cat: "DUPLICATE", hint: CATEGORY_HELP.DUPLICATE },
    { key: "apaar", label: CATEGORY_LABEL.APAAR, value: rbc.APAAR ?? 0, tone: "text-navy-900", cat: "APAAR", hint: CATEGORY_HELP.APAAR },
    { key: "intake", label: "Intake overshoot", value: overSeats, tone: overSeats ? "text-amber-700" : "text-navy-900", cat: "INTAKE", hint: "Seats above approved intake, shown as students." },
    { key: "data", label: CATEGORY_LABEL.DATA, value: rbc.DATA ?? 0, tone: "text-navy-900", cat: "DATA", hint: CATEGORY_HELP.DATA },
    { key: "x", label: CATEGORY_LABEL.CROSS_INSTITUTION, value: rbc.CROSS_INSTITUTION ?? 0, tone: (rbc.CROSS_INSTITUTION ?? 0) ? "text-amber-700" : "text-navy-900", cat: "CROSS_INSTITUTION", hint: CATEGORY_HELP.CROSS_INSTITUTION },
  ];
  return (
    <>
      <PageHeader title={`Validation results, ${sub.academicYear}`}
        subtitle={<span className="flex flex-wrap items-center gap-x-2.5 gap-y-1"><span>{sub.fileName}</span><span className="text-slate-500">version {sub.version}</span><Badge tone={st.tone} dot>{st.label}</Badge><span className="text-slate-500">uploaded {dateTime(sub.createdAt)}</span></span>}
        actions={<><Button asChild variant="secondary"><a href={`/api/v1/submissions/${id}/report`} download><Download aria-hidden />Correction report</a></Button><Button asChild variant="secondary"><Link href="/institution/upload"><FileUp aria-hidden />Upload corrected file</Link></Button></>} />
      <Panel className="mb-6"><Stepper steps={UPLOAD_STEPS} current={step} /></Panel>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card data-tilt className="fade-up flex items-center gap-4 p-5"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-[0_0_28px_-6px_rgba(247,176,56,0.55)]"><TriangleAlert className="size-6" aria-hidden /></span><div><p className="num text-[30px] leading-none text-navy-900">{sub.rejectedCount + sub.reviewCount + subIssues.length}</p><p className="mt-1 text-sm text-slate-600">issues found</p><p className="text-xs text-slate-500">{sub.rejectedCount} to correct · {sub.reviewCount} flagged for review · {subIssues.length} file-level</p></div></Card>
        <Card data-tilt className="fade-up p-5"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700"><ShieldCheck className="size-5" aria-hidden /></span><p className="text-sm font-medium text-navy-900">Data quality</p></div><div className="mt-3 flex items-end justify-between"><p className="num text-[30px] leading-none text-navy-900">{sub.rowCount ? Math.round(((sub.rowCount - sub.rejectedCount) / sub.rowCount) * 100) : 0}%</p><span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">{sub.rejectedCount} rows to fix</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={`${sub.rowCount - sub.rejectedCount} of ${sub.rowCount} rows need no correction`}><div className="bar-grow h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500" style={{ width: `${sub.rowCount ? ((sub.rowCount - sub.rejectedCount) / sub.rowCount) * 100 : 0}%` }} /></div></Card>
        <Card data-tilt className="fade-up p-5"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><ScanSearch className="size-5" aria-hidden /></span><p className="text-sm font-medium text-navy-900">Pattern checks</p></div><p className="num mt-3 text-[26px] leading-none text-navy-900">{(rbc.CROSS_INSTITUTION ?? 0) + (overSeats ? 1 : 0)} <span className="text-[14px] font-normal text-slate-600">for AICTE to look at</span></p><p className="mt-1 text-xs text-slate-500">Cross-institution clashes and intake overshoot are shared with AICTE as questions, not accusations.</p></Card>
      </div>

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="max-w-2xl">
          <p className="font-serif text-lg text-navy-900">{submitted ? (held ? "Part of this file is with AICTE. The rest is waiting for you." : "This file is fully submitted.") : held ? "Fix the flagged rows, or submit the valid ones now." : "Everything passed. You can submit."}</p>
          <p className="mt-1 text-sm text-slate-600">{submitted ? (held ? `${held} rows are on hold. Download the correction report, fix them in your file, and upload it again. Records already submitted are recognised and not added twice.` : "You can see the status of each record below. Students and the Command Centre now include these records.") : `${ready} of ${sub.rowCount} rows can be submitted${held ? `; ${held} must be corrected first and stay on hold` : ""}${skipped ? `; ${skipped} were already on file` : ""}.`}</p>
        </div>
        {!submitted && sub.status !== "SUPERSEDED" && <SubmitButton submissionId={id} ready={ready} held={held} flagged={sub.reviewCount} />}
      </Card>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => { const link = c.cat ? qs({ cat: c.cat, outcome: undefined, page: undefined }) : c.outcome ? qs({ outcome: c.outcome, cat: undefined, page: undefined }) : null; const active = (c.cat && cat === c.cat) || (c.outcome && outcome === c.outcome);
          const inner = (<><p className="flex items-center gap-1.5 text-[13px] text-slate-600">{c.label}<Hint text={c.hint} /></p><p className={cn("num mt-1.5 text-[28px] leading-none", c.tone)}>{fmt(c.value)}</p></>);
          return link ? <Link key={c.key} href={link} aria-current={active ? "true" : undefined} className={cn("fade-up block rounded-card border bg-white p-4 shadow-card transition-colors hover:border-navy-700", active ? "border-navy-900 ring-1 ring-navy-900" : "border-line")}>{inner}</Link> : <Card key={c.key} className="fade-up p-4">{inner}</Card>; })}
      </div>

      <div className="mb-6 space-y-4">
        <Panel title="Intake against your approved seats" description="Approved intake is set for each programme, so each is judged on its own." flush>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Programme</TableHead><TableHead className="text-right">Approved</TableHead><TableHead className="text-right">Already on file</TableHead><TableHead className="text-right">In this file</TableHead><TableHead className="min-w-[150px]">Utilisation</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Overshoot</TableHead></TableRow></TableHeader>
            <TableBody>{intake.length ? intake.map((l) => (
              <TableRow key={l.programmeName}><TableCell className="font-medium text-navy-900">{l.programmeName}</TableCell><TableCell className="tnum text-right">{l.approved}</TableCell><TableCell className="tnum text-right">{l.alreadyOnFile}</TableCell><TableCell className="tnum text-right">{l.inThisFile}</TableCell>
                <TableCell><div className="flex items-center gap-2"><SegmentedBar intake={l.approved} ordinary={l.total} className="max-w-[110px]" /><span className={cn("tnum text-[13px]", l.overshoot ? "font-medium text-red-700" : "text-slate-600")}>{pct(l.utilisation, 1)}</span></div></TableCell>
                <TableCell className="tnum text-right">{l.remaining}</TableCell><TableCell className={cn("tnum text-right", l.overshoot ? "font-medium text-red-700" : "")}>{l.overshoot ? `+${l.overshoot}` : "0"}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={7} className="text-slate-500">No ordinary admissions in this file.</TableCell></TableRow>}</TableBody>
          </Table>
          {(caps.length > 0 || subIssues.length > 0) && <div className="space-y-2 border-t border-line p-4">
            {caps.map((c) => <p key={c.name} className="text-[13px] text-slate-600"><span className="font-medium text-navy-900">{c.name}:</span> {c.count} in this file against an illustrative allowance of {c.allowed} ({c.maxPercent}% of approved seats){c.excess ? <span className="font-medium text-amber-700">, {c.excess} over</span> : ", within the allowance"}. Supernumerary admissions are counted separately from approved intake.</p>)}
            {subIssues.map((i) => <div key={i.id} className="rounded-control bg-amber-100/70 px-3 py-2 text-[13px]"><p className="text-navy-900">{i.message}</p><p className="mt-0.5 text-slate-600">{i.fixHint}</p></div>)}
          </div>}
        </Panel>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="APAAR ID checks" description="Format and the simulated verification, kept apart.">
            <dl className="space-y-1.5 text-sm">{([["Format valid", apaar.formatValid, "green"], ["Format invalid", apaar.formatInvalid, "red"], ["Missing", apaar.missing, "red"], ["Verified by the simulated registry", apaar.mockVerified, "teal"], ["Verification pending", apaar.pending, "blue"], ["Verification unavailable", apaar.unavailable, "amber"]] as const).map(([k, v, tone]) => <div key={k} className="flex items-center justify-between"><dt className="text-slate-600">{k}</dt><dd><Badge tone={tone}>{fmt(v)}</Badge></dd></div>)}</dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">A correctly formatted ID is not a verified student. The simulated registry is a demonstration and is not connected to any government system.</p>
          </Panel>
          <Panel title="Version history" aside={<History className="size-4" aria-hidden />}>
            <ol className="space-y-2 text-sm">{chain.map((c) => <li key={c.id} className="flex items-center justify-between gap-3"><Link href={`/institution/submissions/${c.id}`} className={cn("text-blue-600 underline-offset-2 hover:underline", c.id === id && "font-semibold")}>Version {c.version}</Link><span className="text-xs text-slate-500">{fmt(c.rowCount)} rows · {SUBMISSION_STATUS[c.status].label}</span></li>)}</ol>
          </Panel>
        </div>
      </div>

      <Panel title="Row-by-row results" description={`${fmt(total)} row${total === 1 ? "" : "s"}${cat ? ` with ${CATEGORY_LABEL[cat].toLowerCase()}` : ""}${outcome ? ` marked "${OUTCOME_LABEL[outcome].label.toLowerCase()}"` : ""}. Each problem says what happened and how to fix it.`}
        aside={(cat || outcome) ? <Link href={`/institution/submissions/${id}`} className="text-blue-600 underline-offset-2 hover:underline">Show all rows</Link> : undefined} flush>
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3 text-[13px]">
          {(["", "REJECTED", "REQUIRES_REVIEW", "WARNING", "VALID"] as const).map((o) => <Link key={o || "all"} href={qs({ outcome: o || undefined, page: undefined })} className={cn("rounded-full border px-3 py-1", (outcome ?? "") === o ? "border-navy-900 bg-navy-900 text-white" : "border-line-strong bg-white text-slate-600 hover:bg-paper")}>{o ? OUTCOME_LABEL[o].label : "All results"}</Link>)}
        </div>
        {rows.length === 0 ? <p className="p-5 text-sm text-slate-500">No rows match this filter.</p> : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Row</TableHead><TableHead>Student</TableHead><TableHead>Programme</TableHead><TableHead>Result</TableHead><TableHead className="min-w-[380px]">What we found and how to fix it</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => { const o = OUTCOME_LABEL[r.outcome]; return (
              <TableRow key={r.rowNumber} className={cn(r.outcome === "REJECTED" && "bg-red-100/40 shadow-[inset_3px_0_0_0_#e5483b]", r.outcome === "REQUIRES_REVIEW" && "bg-amber-100/40 shadow-[inset_3px_0_0_0_#f0b04a]")}>
                <TableCell className="tnum text-slate-600">{r.rowNumber}</TableCell>
                <TableCell><p className="text-navy-900">{r.name || <span className="text-slate-500">(no name)</span>}</p><p className="font-mono text-xs text-slate-500">{r.studentRef} · {r.apaar}</p></TableCell>
                <TableCell>{r.programme || "–"}</TableCell>
                <TableCell><Badge tone={o.tone} dot>{o.label}</Badge>{r.disposition === "SKIPPED" && <p className="mt-1 text-xs text-slate-500">already on file</p>}</TableCell>
                <TableCell>{r.issues.length === 0 ? <span className="text-sm text-green-700">No problems found.</span> : <ul className="space-y-2.5">{r.issues.map((i) => <li key={i.id} className="text-[13px]"><span className="mr-2"><Badge tone={i.severity === "REJECTED" ? "red" : i.severity === "REQUIRES_REVIEW" ? "amber" : "blue"}>{CATEGORY_LABEL[i.category]}</Badge></span><span className="text-navy-900">{i.message}</span><span className="mt-0.5 block text-slate-600"><span className="font-medium">How to fix: </span>{i.fixHint}</span></li>)}</ul>}</TableCell>
              </TableRow>); })}</TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
          {page > 1 ? <Link className="text-blue-600" href={qs({ page: String(page - 1) })}>Previous</Link> : <span />}<span className="text-slate-500">Page {page} of {Math.max(1, Math.ceil(total / PAGE))}</span>{page * PAGE < total ? <Link className="text-blue-600" href={qs({ page: String(page + 1) })}>Next</Link> : <span />}
        </div>
      </Panel>
    </>
  );
}
