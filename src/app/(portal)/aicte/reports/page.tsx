// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { institutionScope, REGION_LABEL } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { ReportBuilder } from "./report-builder";
import Link from "next/link";
import { ChevronRight, FileDown } from "lucide-react";
import { alertCounts } from "@/lib/queries/alerts";
import { dateTime } from "@/lib/format";
import { CURRENT_AY } from "@/lib/years";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function Reports() {
  const user = await requirePermission("reports:export");
  const insts = await db.institution.findMany({ where: institutionScope(user), orderBy: { name: "asc" }, select: { id: true, name: true, region: true } });
  const [counts, pendingSubs, exports] = await Promise.all([alertCounts(user),
    db.institution.count({ where: { ...institutionScope(user), submissions: { none: { academicYear: CURRENT_AY, OR: [{ acceptedAt: { not: null } }, { submittedAt: { not: null } }] } } } }),
    db.auditLog.findMany({ where: { action: "REPORT_EXPORTED", actorUserId: user.id }, orderBy: { seq: "desc" }, take: 6 })]);
  const tasks = [{ t: "Submissions not received", d: `${pendingSubs} institutions for ${CURRENT_AY}`, href: "/aicte/institutions", n: pendingSubs }, { t: "Conflicts to review", d: "Possible double enrolments", href: "/aicte/alerts?tab=conflicts", n: counts.conflicts }, { t: "Alerts to review", d: `${counts.high} high severity`, href: "/aicte/alerts", n: counts.anomalies }];
  const regions = [...new Set(insts.map((i) => i.region))].sort().map((r) => ({ value: r, label: REGION_LABEL[r as keyof typeof REGION_LABEL] }));
  return (
    <>
      <PageHeader title="Reports" subtitle="Download what you can see, as CSV for spreadsheets or PDF for sharing. Each file states its academic year, when it was made and where the numbers come from." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel title="Build a report" description={user.region ? `Limited to your region (${REGION_LABEL[user.region]}).` : "Choose a report, a year and, where relevant, a region or institution."}><ReportBuilder institutions={insts.map((i) => ({ id: i.id, name: i.name }))} regions={regions} /></Panel>
      <div className="space-y-4">
        <Panel title="Pending tasks" flush><ul className="divide-y divide-line">{tasks.map((x) => <li key={x.t}><Link href={x.href} className="flex items-center gap-3 px-5 py-3 hover:bg-paper"><span className="num grid size-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-[15px] text-blue-700">{x.n}</span><span className="min-w-0 flex-1"><span className="block text-sm text-navy-900">{x.t}</span><span className="block text-xs text-slate-500">{x.d}</span></span><ChevronRight className="size-4 text-slate-500" aria-hidden /></Link></li>)}</ul></Panel>
        <Panel title="Recent exports" description="Your last downloads, from the audit trail." flush>{exports.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">Nothing exported yet.</p> : <ul className="divide-y divide-line">{exports.map((e) => { const m = (e.metadata ?? {}) as { report?: string; ay?: string; format?: string }; return <li key={e.seq.toString()} className="flex items-center gap-3 px-5 py-3"><FileDown className="size-4 shrink-0 text-slate-500" aria-hidden /><span className="min-w-0 flex-1"><span className="block text-sm capitalize text-navy-900">{(m.report ?? "report").replace("-", " ")} {m.ay}</span><span className="block text-xs text-slate-500">{dateTime(e.createdAt)}</span></span><span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium uppercase text-teal-700">{m.format ?? "file"}</span></li>; })}</ul>}</Panel>
      </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">Reports contain institution-level figures only. No student names, dates of birth or APAAR IDs are ever included. All data in this prototype is synthetic. Every download is recorded in the audit trail.</p>
    </>
  );
}
