// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { CircleCheck, CircleDashed, Fingerprint, Gauge, ShieldQuestion } from "lucide-react";
import { CategoryChart, TrendChart } from "@/components/charts";
import { SeatLedgerTable } from "@/components/seat-ledger";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, KeyFact, PageHeader, Panel, StatCard } from "@/components/ui";
import { YearSwitcher } from "@/components/year-switcher";
import { requirePermission } from "@/lib/auth/guards";
import { dateOnly, fmt, pct, TYPE_LABEL } from "@/lib/format";
import { getCategoryMix, getTrend } from "@/lib/queries/charts";
import { getInstitutionOverview } from "@/lib/queries/institution";
import { CURRENT_AY, isValidAY } from "@/lib/years";

export const metadata = { title: "Institution overview" };
export const dynamic = "force-dynamic";

const STATUS_TONE = { ACCEPTED: "green", SUPERSEDED: "neutral", NEEDS_CORRECTION: "amber", REJECTED: "red", UPLOADED: "blue", VALIDATING: "blue", VALIDATED: "teal" } as const;

export default async function InstitutionHome({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requirePermission("institution:view");
  const { ay: q } = await searchParams;
  const ay = isValidAY(q) ? q : CURRENT_AY;
  const [o, trend, categories] = await Promise.all([getInstitutionOverview(user, ay), getTrend(user), getCategoryMix(user, ay)]);
  const inst = o.institution;
  const qual = o.quality;
  const intake = o.rows.reduce((t, r) => t + r.intake, 0);
  const ordinary = o.rows.reduce((t, r) => t + r.ordinary, 0);
  const hasData = !!qual && qual.total > 0;

  return (
    <>
      <PageHeader title={inst.name}
        subtitle={<span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span>{inst.city}, {inst.stateName}</span><Badge tone="neutral">{TYPE_LABEL[inst.type]}</Badge>
          <span className="font-mono text-[12px] text-slate-500">AICTE ID {inst.aicteId}</span><span className="text-slate-500">est. {inst.establishedYear}</span>
          {o.approval && <Badge tone={o.approval.status === "APPROVED" ? "green" : "amber"} dot>{o.approval.status === "APPROVED" ? "Approved" : "Conditionally approved"} for {ay}</Badge>}
        </span>}
        actions={<YearSwitcher basePath="/institution" current={ay} />} />

      {o.notifications.map((n) => (
        <div key={n.id} className="fade-up mb-3 flex items-start gap-3 rounded-card border border-amber-600/25 bg-amber-100/70 px-4 py-3 text-sm text-navy-900"><CircleDashed className="mt-0.5 size-[18px] shrink-0 text-amber-700" aria-hidden /><p><strong className="font-medium">{n.title}.</strong> {n.body}</p></div>
      ))}
      {o.approval?.remarks && <div className="mb-3 rounded-card border border-amber-600/25 bg-amber-100/70 px-4 py-3 text-sm text-navy-900">{o.approval.remarks}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Gauge} label="Ordinary seats filled" value={hasData ? pct(intake ? ordinary / intake : null) : "–"} tone={ordinary > intake ? "red" : undefined} hint={hasData ? `${fmt(ordinary)} of ${fmt(intake)} approved seats` : "No records submitted for this year."} />
        <StatCard icon={Fingerprint} tone="teal" label="APAAR coverage" value={hasData ? pct(qual!.ok / qual!.total, 1) : "–"} hint={hasData ? `${fmt(qual!.missing)} missing · ${fmt(qual!.invalid)} invalid format` : "Nothing to measure yet."} />
        <StatCard icon={ShieldQuestion} tone="amber" label="Awaiting verification" value={hasData ? fmt(qual!.awaiting) : "–"} hint="Records without a structurally valid APAAR ID." />
        <StatCard icon={o.accepted ? CircleCheck : CircleDashed} tone={o.accepted ? "green" : "amber"} label={`Submission, ${ay}`} value={<span className="text-[24px]">{o.accepted ? `Accepted v${o.accepted.version}` : "Pending"}</span>} hint={o.accepted ? `${fmt(o.accepted.rowCount)} records · accepted ${o.accepted.acceptedAt ? dateOnly(o.accepted.acceptedAt) : "–"}` : "No accepted submission on file."} />
      </div>

      <div className="mb-6">
        {!o.accepted && <p className="mb-2 text-[13px] text-slate-500">No accepted submission for {ay}, so seats appear open. Approved intake below is from your AICTE approval.</p>}
        <SeatLedgerTable ay={ay} rows={o.rows} />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Your admissions and approved intake by year"><TrendChart data={trend} /></Panel>
        <Panel title={`Admissions by category, ${ay}`}>{hasData ? <CategoryChart rows={categories} /> : <Empty title="No admissions recorded for this year" />}</Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel title="AICTE approval">
          {o.approval ? (
            <dl>
              <KeyFact label="Status" value={<Badge tone={o.approval.status === "APPROVED" ? "green" : "amber"}>{o.approval.status === "APPROVED" ? "Approved" : "Conditional"}</Badge>} />
              <KeyFact label="Reference" value={<span className="font-mono text-[12px]">{o.approval.referenceNo}</span>} />
              <KeyFact label="Valid until" value={<span className="text-[15px]">{dateOnly(o.approval.validTo)}</span>} />
            </dl>
          ) : <Empty title="No approval on file" />}
        </Panel>
        <Panel title="Submission history" flush>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Year</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Records</TableHead><TableHead className="text-right">Need review</TableHead><TableHead className="text-right">Rejected</TableHead></TableRow></TableHeader>
            <TableBody>
              {o.submissions.map((s) => (
                <TableRow key={s.id}><TableCell>{s.academicYear}</TableCell><TableCell>v{s.version}</TableCell><TableCell><Badge tone={STATUS_TONE[s.status]}>{s.status.replace("_", " ").toLowerCase()}</Badge></TableCell><TableCell className="tnum text-right">{fmt(s.rowCount)}</TableCell><TableCell className="tnum text-right">{fmt(s.reviewCount)}</TableCell><TableCell className="tnum text-right">{fmt(s.rejectedCount)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
