// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { CompareChart } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Panel } from "@/components/ui";
import { YearSwitcher } from "@/components/year-switcher";
import { requirePermission } from "@/lib/auth/guards";
import { institutionScope, REGION_LABEL } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { fmt } from "@/lib/format";
import { classify, css, readableOn, SCALES } from "@/lib/geo/tile-colors";
import { loadProgrammeSeats, seatsOf } from "@/lib/queries/intake";
import { loadTrust } from "@/lib/trust/service";
import { ACADEMIC_YEARS, CURRENT_AY, isValidAY } from "@/lib/years";

export const metadata = { title: "Regional analytics" };
export const dynamic = "force-dynamic";

export default async function Regions({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requirePermission("national:view");
  const { ay: q } = await searchParams, ay = isValidAY(q) ? q : CURRENT_AY;
  const insts = await db.institution.findMany({ where: institutionScope(user), select: { id: true, region: true } });
  const ids = insts.map((i) => i.id), region = new Map(insts.map((i) => [i.id, i.region as string]));
  const [seats, { rows: trust }, subs, anomalies, conflicts] = await Promise.all([loadProgrammeSeats(), loadTrust(),
    db.dataSubmission.findMany({ where: { academicYear: ay, institutionId: { in: ids }, OR: [{ acceptedAt: { not: null } }, { submittedAt: { not: null } }] }, select: { institutionId: true } }),
    db.anomalyAlert.findMany({ where: { institutionId: { in: ids }, status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { institutionId: true, severity: true } }),
    db.duplicateAlert.findMany({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] }, institutionAId: { in: ids } }, select: { institutionAId: true } })]);
  const submitted = new Set(subs.map((s) => s.institutionId)), regions = [...new Set(insts.map((i) => i.region))].sort();
  const stats = regions.map((r) => {
    const mine = insts.filter((i) => i.region === r), live = mine.filter((i) => submitted.has(i.id));
    const s = live.reduce((t, i) => { const x = seatsOf(seats.get(`${i.id}|${ay}`) ?? []); return { intake: t.intake + x.intake, ordinary: t.ordinary + x.ordinary, over: t.over + x.over }; }, { intake: 0, ordinary: 0, over: 0 });
    const scores = mine.map((i) => trust.get(`${i.id}|${ay}`)!.result).flatMap((x) => (x.scored ? [x.overall] : []));
    return { r, label: REGION_LABEL[r as keyof typeof REGION_LABEL], institutions: mine.length, submitted: live.length, ...s, util: s.intake ? s.ordinary / s.intake : null, avgTrust: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      alerts: anomalies.filter((a) => region.get(a.institutionId) === r).length, high: anomalies.filter((a) => region.get(a.institutionId) === r && a.severity !== "LOW" && a.severity !== "MEDIUM").length, conflicts: conflicts.filter((c) => region.get(c.institutionAId) === r).length };
  });
  const heat = regions.map((r) => ({ r, label: REGION_LABEL[r as keyof typeof REGION_LABEL], cells: ACADEMIC_YEARS.map((y) => { const t = insts.filter((i) => i.region === r).reduce((a, i) => { const x = seatsOf(seats.get(`${i.id}|${y}`) ?? []); return x.ordinary > 0 ? { intake: a.intake + x.intake, ordinary: a.ordinary + x.ordinary } : a; }, { intake: 0, ordinary: 0 }); return t.intake ? t.ordinary / t.intake : null; }) }));
  return (
    <>
      <PageHeader title="Regional analytics" subtitle={`How regions compare for ${ay}: seats, submissions, Trust Scores and alerts. Only institutions that have submitted count toward seat figures.`} actions={<YearSwitcher basePath="/aicte/regions" current={ay} />} />
      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Panel title={`Seats by region, ${ay}`}><CompareChart title={`Approved intake against seats filled by region, ${ay}`} rows={stats.map((s) => ({ label: s.label, intake: s.intake, ordinary: s.ordinary, supernumerary: 0 }))} caption="Institutions with no submission for the year are excluded." /></Panel>
        <Panel title="Submission status" description={`Institutions that have submitted for ${ay}.`}>
          <ul className="space-y-4">{stats.map((s) => <li key={s.r}><div className="mb-1.5 flex items-baseline justify-between text-sm"><span className="text-navy-900">{s.label}</span><span className="tnum text-slate-600">{s.submitted} of {s.institutions} submitted</span></div><div className="flex h-3 overflow-hidden rounded-full bg-amber-100" role="img" aria-label={`${s.submitted} of ${s.institutions} institutions submitted`}><div className="bar-grow h-full bg-teal-600" style={{ width: `${(s.submitted / s.institutions) * 100}%` }} /></div></li>)}</ul>
          <p className="mt-4 flex gap-4 text-xs text-slate-600"><span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[3px] bg-teal-600" />Submitted</span><span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[3px] bg-amber-100 ring-1 ring-amber-600/30" />Pending</span></p>
        </Panel>
      </div>
      <Panel title="Seat utilisation heatmap" description="Ordinary seats filled as a share of approved intake, by region and year. Darker is fuller; red is above approved intake overall." className="mb-6">
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] border-separate border-spacing-1.5 text-sm"><caption className="sr-only">Seat utilisation by region and academic year</caption>
          <thead><tr><th scope="col" className="p-2 text-left text-xs font-medium text-slate-500">Region</th>{ACADEMIC_YEARS.map((y) => <th key={y} scope="col" className="p-2 text-center text-xs font-medium text-slate-500">{y}</th>)}</tr></thead>
          <tbody>{heat.map((h) => <tr key={h.r}><th scope="row" className="p-2 text-left font-medium text-navy-900">{h.label}</th>{h.cells.map((v, i) => { const over = v !== null && v > 1, bg = v === null ? [238, 242, 248] as [number, number, number] : over ? [251, 228, 225] as [number, number, number] : SCALES.blue[classify(v / 1.0)], fg = v === null ? [71, 88, 113] as [number, number, number] : over ? [143, 27, 18] as [number, number, number] : readableOn(bg);
            return <td key={i} className="rounded-md p-3 text-center" style={{ background: css(bg), color: css(fg) }}><span className="tnum font-medium">{v === null ? "no data" : `${(v * 100).toFixed(0)}%`}</span></td>; })}</tr>)}</tbody></table></div>
      </Panel>
      <Panel title={`Regional summary, ${ay}`} flush>
        <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Region</TableHead><TableHead className="text-right">Institutions</TableHead><TableHead className="text-right">Seats filled / approved</TableHead><TableHead className="text-right">Above intake</TableHead><TableHead className="text-right">Avg Trust Score</TableHead><TableHead className="text-right">Alerts</TableHead><TableHead className="text-right">Conflicts</TableHead></TableRow></TableHeader>
          <TableBody>{stats.map((s) => <TableRow key={s.r}><TableCell className="font-medium text-navy-900">{s.label}</TableCell><TableCell className="tnum text-right">{s.institutions}</TableCell><TableCell className="tnum text-right">{fmt(s.ordinary)} / {fmt(s.intake)}</TableCell><TableCell className="tnum text-right">{s.over ? <Badge tone="red">+{s.over}</Badge> : "–"}</TableCell><TableCell className="tnum text-right">{s.avgTrust ?? "–"}</TableCell><TableCell className="tnum text-right">{s.alerts}{s.high ? <span className="text-red-700"> ({s.high} high)</span> : ""}</TableCell><TableCell className="tnum text-right">{s.conflicts || "–"}</TableCell></TableRow>)}</TableBody></Table>
      </Panel>
    </>
  );
}
