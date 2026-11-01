// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { AlertTriangle, CircleDashed, Copy, Fingerprint, GraduationCap, ShieldAlert, UserRoundX } from "lucide-react";
import { ApaarTrendChart, CategoryChart, CompareChart, Sparkline, TrendChart, CHART } from "@/components/charts";
import { SeatLedgerSummary } from "@/components/seat-ledger";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, StatCard } from "@/components/ui";
import { YearSwitcher } from "@/components/year-switcher";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { REGION_LABEL } from "@/lib/auth/permissions";
import { fmt, pct, TYPE_LABEL } from "@/lib/format";
import { getCategoryMix, getTrend } from "@/lib/queries/charts";
import { alertCounts } from "@/lib/queries/alerts";
import { getHeroStats } from "@/lib/queries/people";
import { EnrolmentHero, GroupSpread } from "@/components/enrolment-hero";
import { institutionTableRows } from "@/lib/queries/table-rows";
import { loadTrust } from "@/lib/trust/service";
import { db } from "@/lib/db";
import Link from "next/link";
import { BadgeCheck, Siren, Scale } from "lucide-react";
import { getNationalSnapshot } from "@/lib/queries/national";
import { CURRENT_AY, isValidAY } from "@/lib/years";
import { CommandMap } from "./command-map";
import { InstitutionsTable } from "@/components/institutions-table";

export const metadata = { title: "National Command Centre" };
export const dynamic = "force-dynamic";

export default async function CommandCentre({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requirePermission("national:view");
  const { ay: q } = await searchParams;
  const ay = isValidAY(q) ? q : CURRENT_AY;
  const [snap, trend, categories, counts, { rows: trust }] = await Promise.all([getNationalSnapshot(user, ay), getTrend(user), getCategoryMix(user, ay), alertCounts(user), loadTrust()]);
  const hero = await getHeroStats(snap.institutions.filter((i) => i.submission.status === "ACCEPTED" || i.admitted > 0).map((i) => i.id), ay);
  const openByInst = new Map((await db.anomalyAlert.groupBy({ by: ["institutionId"], where: { institutionId: { in: snap.institutions.map((i) => i.id) }, status: { in: ["OPEN", "UNDER_REVIEW"] } }, _count: true })).map((g) => [g.institutionId, g._count]));
  const scores = snap.institutions.flatMap((i) => { const r = trust.get(`${i.id}|${ay}`)?.result; return r?.scored ? [r.overall] : []; });
  const avgTrust = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const attentionList = snap.institutions.map((i) => { const t = trust.get(`${i.id}|${ay}`)?.result; const reasons = [...i.signals, ...(openByInst.get(i.id) ? [`${openByInst.get(i.id)} open alert${openByInst.get(i.id) === 1 ? "" : "s"}`] : []), ...(t?.scored && t.overall < 70 ? [`Trust Score ${t.overall}`] : [])]; return { i, reasons }; }).filter((x) => x.reasons.length).sort((a, b) => b.reasons.length - a.reasons.length).slice(0, 6);
  await audit({ actor: user, action: "NATIONAL_DASHBOARD_VIEWED", metadata: { academicYear: ay, institutions: snap.kpis.institutions } });
  const k = snap.kpis;
  const submitted = snap.institutions.filter((i) => i.submission.status === "ACCEPTED");
  const compare = submitted.map((i) => ({ label: i.shortName, ordinary: i.ordinary, supernumerary: i.supernumerary, intake: i.intake }))
    .sort((a, b) => b.ordinary / (b.intake || 1) - a.ordinary / (a.intake || 1));
  // Only years in which every institution in view has submitted: a partial year would look like a fall in admissions.
  const admissionsByYear = trend.map((t) => (t.reporting === snap.institutions.length ? t.ordinary + t.supernumerary : null));
  const tableRows = institutionTableRows(snap, trust, ay);
  const attention = [
    k.overIntake > 0 && `${k.overIntake} institution${k.overIntake === 1 ? "" : "s"} above approved intake`,
    k.pending > 0 && `${k.pending} submission${k.pending === 1 ? "" : "s"} pending`,
    k.crossMatches > 0 && `${fmt(k.crossMatches)} APAAR IDs found at more than one institution`,
    k.missing + k.invalid > 0 && `${fmt(k.missing + k.invalid)} admissions without a usable APAAR ID`,
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader title="National Command Centre"
        subtitle={<>Admissions in <strong className="font-medium text-navy-900">{ay}</strong> across {k.institutions} institutions, calculated live from submitted student records. <Badge tone="blue" className="ml-1 align-middle">{user.region ? `${REGION_LABEL[user.region]} region only` : "All institutions"}</Badge></>}
        actions={<YearSwitcher basePath="/aicte" current={ay} />} />

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <EnrolmentHero ay={ay} scope={user.region ? `${REGION_LABEL[user.region]} region` : "all institutions"} {...hero} />
        <GroupSpread groups={categories} ay={ay} />
      </div>

      <div className="fade-up mb-6 flex items-start gap-3 rounded-card border border-amber-600/25 bg-amber-100/70 px-4 py-3.5">
        <AlertTriangle className="mt-0.5 size-[18px] shrink-0 text-amber-700" aria-hidden />
        <p className="text-[14px] leading-relaxed text-navy-900"><span className="font-medium">Needs attention in {ay}: </span>{attention.length ? attention.join(" · ") : "nothing flagged by the current rule checks."}</p>
      </div>

      <div className="mb-6"><SeatLedgerSummary rows={submitted.map((i) => ({ intake: i.intake, ordinary: i.ordinary, supernumerary: i.supernumerary, over: i.over, open: i.open }))} reporting={submitted.length} total={snap.institutions.length} ay={ay} /></div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={GraduationCap} label={`Admissions, ${ay}`} value={fmt(k.admissions)} hint={`${fmt(k.onRoll)} students on roll across all years. Trend shows only years where every institution has submitted.`}><Sparkline values={admissionsByYear} /></StatCard>
        <StatCard icon={Fingerprint} tone="teal" label="APAAR coverage" value={pct(k.apaarCoverage, 1)} hint="Admissions with a well-formed ID. Structural check only; not verified against the official system."><Sparkline values={trend.map((t) => t.apaarCoverage)} color={CHART.teal} /></StatCard>
        <StatCard icon={UserRoundX} tone="amber" label="Admissions without a usable ID" value={fmt(k.missing + k.invalid)} hint={`${fmt(k.missing)} missing · ${fmt(k.invalid)} invalid format · ${fmt(k.awaiting)} awaiting verification`} />
        <StatCard icon={Copy} tone={k.crossMatches > 0 ? "red" : "green"} label="IDs at more than one institution" value={fmt(k.crossMatches)} hint="Across all years. Flagged for human review, never merged automatically." />
        <StatCard icon={ShieldAlert} tone={k.overIntake > 0 ? "red" : "green"} label="Institutions above approved intake" value={fmt(k.overIntake)} hint="Ordinary seats only. Supernumerary admissions are not counted as violations." />
        <StatCard icon={CircleDashed} tone={k.pending > 0 ? "amber" : "green"} label={`Submissions pending, ${ay}`} value={fmt(k.pending)} hint="Institutions with no accepted submission for this year." />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard href="/aicte/alerts?tab=conflicts" icon={Scale} tone={counts.conflicts ? "amber" : "green"} label="Open cross-institution conflicts" value={fmt(counts.conflicts)} hint="Students who appear enrolled at two places. Flags for human review, never an accusation." />
        <StatCard href="/aicte/alerts" icon={Siren} tone={counts.high ? "red" : counts.anomalies ? "amber" : "green"} label="Open unusual-pattern alerts" value={fmt(counts.anomalies)} hint={`${counts.high} high severity. Each explains why it was raised.`} />
        <StatCard href="/aicte/trust" icon={BadgeCheck} tone="teal" label={`Average Trust Score, ${ay}`} value={avgTrust ?? "–"} hint={`${scores.length} of ${snap.institutions.length} institutions scored. A prototype measure, not an official rating.`} />
      </div>
      {attentionList.length > 0 && <Panel title="Institutions requiring attention" description="Combines rule signals, open alerts and low Trust Scores." className="mb-6 fade-up" flush>
        <ul className="divide-y divide-line">{attentionList.map(({ i, reasons }) => <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><Link href={`/aicte/institutions/${i.id}?ay=${ay}`} className="font-medium text-blue-600 underline-offset-2 hover:underline">{i.name}</Link><p className="text-xs text-slate-500">{i.city}, {i.stateName}</p></div><div className="flex flex-wrap gap-1.5">{reasons.map((r) => <Badge key={r} tone="red">{r}</Badge>)}</div></li>)}</ul>
      </Panel>}
      <Panel title="State view" description="Equal-size tiles keep small states visible. Select a tile for its institutions." className="mb-6 fade-up">
        <CommandMap ay={ay} states={snap.states}
          institutions={snap.institutions.map((i) => ({ id: i.id, name: i.name, city: i.city, state: i.state, admitted: i.admitted, intake: i.intake, utilisation: i.utilisation, apaarCoverage: i.apaarCoverage, signals: i.signals }))} />
      </Panel>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Admissions and approved intake by year"><TrendChart data={trend} /></Panel>
        <Panel title="APAAR coverage by year"><ApaarTrendChart data={trend} /></Panel>
        <Panel title={`Intake against admissions, ${ay}`} aside="Highest utilisation first"><CompareChart title={`Intake against admissions by institution, ${ay}`} rows={compare} caption="Institutions with no accepted submission for this year are left out. Red marks ordinary admissions above approved intake." /></Panel>
        <Panel title={`Admissions by category, ${ay}`}><CategoryChart rows={categories} /></Panel>
      </div>

      <Panel title="Institutions" description="Sort any column, search, or show only flagged institutions. Signals are simple rule checks, not predictions." flush>
        <InstitutionsTable data={tableRows} />
      </Panel>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">Definitions: admissions exclude withdrawn students; utilisation is shown only for institutions with an accepted submission; ordinary-seat use counts General, OBC, SC, ST and EWS admissions against approved intake. Supernumerary categories (NRI, OCI, FN, TFWS) are reported separately. Risk scores and anomaly alerts are not available yet.</p>
    </>
  );
}
