// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { SegmentedBar } from "@/components/seat-ledger";
import { TrustView } from "@/components/trust-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Panel } from "@/components/ui";
import { YearSwitcher } from "@/components/year-switcher";
import { requirePermission } from "@/lib/auth/guards";
import { institutionScope, REGION_LABEL } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { dateTime, fmt, pct, TYPE_LABEL } from "@/lib/format";
import { SUBMISSION_STATUS } from "@/lib/labels";
import { getSeatLedger } from "@/lib/queries/ledger";
import { loadTrust } from "@/lib/trust/service";
import { ACADEMIC_YEARS, CURRENT_AY, isValidAY } from "@/lib/years";
import { cn } from "@/lib/utils";

export const metadata = { title: "Institution" };
export const dynamic = "force-dynamic";

export default async function InstitutionDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ay?: string }> }) {
  const user = await requirePermission("national:view");
  const { id } = await params, { ay: q } = await searchParams, ay = isValidAY(q) ? q : CURRENT_AY;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const inst = await db.institution.findFirst({ where: { id, ...institutionScope(user) } }); // out-of-scope institutions are simply not found
  if (!inst) notFound();
  const [ledger, { rows, weights }, anomalies, conflicts, subs] = await Promise.all([
    getSeatLedger(user, ay).then((l) => l.filter((r) => r.institutionId === id)), loadTrust(),
    db.anomalyAlert.findMany({ where: { institutionId: id, academicYear: ay }, orderBy: { severity: "desc" } }),
    db.duplicateAlert.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] }, OR: [{ institutionAId: id }, { institutionBId: id }] } }),
    db.dataSubmission.findMany({ where: { institutionId: id }, orderBy: [{ academicYear: "desc" }, { version: "desc" }], take: 8 }),
  ]);
  const trend = ACADEMIC_YEARS.map((y) => { const r = rows.get(`${id}|${y}`)!.result; return { ay: y, overall: r.scored ? r.overall : null }; });
  return (
    <>
      <PageHeader title={inst.name} subtitle={<span className="flex flex-wrap items-center gap-2"><span>{inst.city}, {inst.stateName}</span><Badge tone="neutral">{TYPE_LABEL[inst.type]}</Badge><Badge tone="blue">{REGION_LABEL[inst.region]} region</Badge><span className="font-mono text-xs text-slate-500">AICTE ID {inst.aicteId}</span></span>}
        actions={<><YearSwitcher basePath={`/aicte/institutions/${id}`} current={ay} /><Button asChild variant="secondary"><a href={`/api/v1/reports/institution/${id}?ay=${ay}`} download><FileText aria-hidden />PDF report</a></Button></>} />
      <div className="mb-6"><TrustView ay={ay} result={rows.get(`${id}|${ay}`)!.result} trend={trend} weightSource={weights.source === "default" ? "documented defaults" : "set by this installation"} /></div>
      <Panel title={`Seat ledger, ${ay}`} className="mb-6" flush aside={<Button asChild variant="ghost" size="sm"><a href={`/api/v1/reports/seat-ledger?ay=${ay}`} download><Download aria-hidden />CSV</a></Button>}>
        <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Programme</TableHead><TableHead className="text-right">Approved</TableHead><TableHead className="text-right">Filled</TableHead><TableHead>Use</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Above intake</TableHead><TableHead className="text-right">Supernumerary</TableHead></TableRow></TableHeader>
          <TableBody>{ledger.map((r) => <TableRow key={r.programmeId}><TableCell className="font-medium text-navy-900">{r.programme}</TableCell><TableCell className="tnum text-right">{r.intake}</TableCell><TableCell className="tnum text-right">{r.ordinary}</TableCell><TableCell><div className="flex items-center gap-2"><SegmentedBar intake={r.intake} ordinary={r.ordinary} className="w-24" /><span className={cn("tnum text-[13px]", r.overshoot ? "font-medium text-red-700" : "text-slate-600")}>{pct(r.utilisation)}</span></div></TableCell><TableCell className="tnum text-right">{r.remaining}</TableCell><TableCell className={cn("tnum text-right", r.overshoot && "font-medium text-red-700")}>{r.overshoot ? `+${r.overshoot}` : "–"}</TableCell><TableCell className="tnum text-right">{r.supernumerary}</TableCell></TableRow>)}</TableBody></Table>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Alerts for ${ay}`} aside={<Link href="/aicte/alerts" className="text-blue-600 underline-offset-2 hover:underline">All alerts</Link>}>
          {anomalies.length === 0 ? <p className="text-sm text-slate-600">No alerts for this year.</p> : <ul className="space-y-3">{anomalies.map((a) => { const e = a.explanation as { headline: string }; return <li key={a.id} className="text-sm"><Badge tone={a.severity === "HIGH" ? "red" : a.severity === "MEDIUM" ? "amber" : "blue"}>{a.severity.toLowerCase()}</Badge> <span className="text-navy-900">{e.headline}</span> <span className="text-xs text-slate-500">({a.status.toLowerCase().replace("_", " ")})</span></li>; })}</ul>}
          <p className="mt-4 text-[13px] text-slate-600">{conflicts} unresolved cross-institution conflict{conflicts === 1 ? "" : "s"} involve this institution (all years). <Link href="/aicte/alerts?tab=conflicts" className="text-blue-600 underline-offset-2 hover:underline">Review conflicts</Link></p>
        </Panel>
        <Panel title="Submissions" flush>
          <Table><TableBody>{subs.length ? subs.map((s) => <TableRow key={s.id}><TableCell>{s.academicYear} v{s.version}</TableCell><TableCell><Badge tone={SUBMISSION_STATUS[s.status].tone} dot>{SUBMISSION_STATUS[s.status].label}</Badge></TableCell><TableCell className="tnum text-right text-slate-600">{fmt(s.rowCount)} rows</TableCell><TableCell className="whitespace-nowrap text-xs text-slate-500">{dateTime(s.createdAt)}</TableCell></TableRow>) : <TableRow><TableCell className="text-slate-500">No submissions yet.</TableCell></TableRow>}</TableBody></Table>
        </Panel>
      </div>
    </>
  );
}
