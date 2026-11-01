// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { Download } from "lucide-react";
import { CompareChart } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui";
import { YearSwitcher } from "@/components/year-switcher";
import { requirePermission } from "@/lib/auth/guards";
import { REGION_LABEL } from "@/lib/auth/permissions";
import { fmt } from "@/lib/format";
import { getSeatLedger } from "@/lib/queries/ledger";
import { CURRENT_AY, isValidAY } from "@/lib/years";
import { LedgerTable } from "./ledger-table";

export const metadata = { title: "Live seat ledger" };
export const dynamic = "force-dynamic";

export default async function SeatLedger({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requirePermission("national:view");
  const { ay: q } = await searchParams, ay = isValidAY(q) ? q : CURRENT_AY;
  const rows = await getSeatLedger(user, ay), live = rows.filter((r) => r.submitted);
  const agg = (key: (r: (typeof rows)[number]) => string) => { const m = new Map<string, { intake: number; ordinary: number; supernumerary: number }>(); for (const r of live) { const k = key(r), v = m.get(k) ?? { intake: 0, ordinary: 0, supernumerary: 0 }; v.intake += r.intake; v.ordinary += r.ordinary; v.supernumerary += r.supernumerary; m.set(k, v); } return [...m.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.ordinary / (b.intake || 1) - a.ordinary / (a.intake || 1)); };
  const byRegion = agg((r) => REGION_LABEL[r.region as keyof typeof REGION_LABEL]), byProgramme = agg((r) => r.programmeCode);
  const totals = live.reduce((t, r) => ({ intake: t.intake + r.intake, ordinary: t.ordinary + r.ordinary, over: t.over + r.overshoot }), { intake: 0, ordinary: 0, over: 0 });
  return (
    <>
      <PageHeader title="Live seat ledger" subtitle={<>Approved intake against seats actually filled, for <strong className="font-medium text-navy-900">{ay}</strong>, programme by programme. Calculated from submitted records each time this page loads. Supernumerary admissions are shown separately and never count against intake.</>}
        actions={<><YearSwitcher basePath="/aicte/seat-ledger" current={ay} /><Button asChild variant="secondary"><a href={`/api/v1/reports/seat-ledger?ay=${ay}`} download><Download aria-hidden />Export CSV</a></Button></>} />
      <p className="mb-5 text-[13px] text-slate-600">{live.length} of {rows.length} programme rows come from institutions that have submitted for {ay} ({fmt(totals.ordinary)} ordinary seats filled of {fmt(totals.intake)} approved{totals.over ? `, ${fmt(totals.over)} above intake` : ""}). Institutions that have not submitted show approved intake with no admissions and are excluded from the charts. <Link href="/aicte/regions" className="text-blue-600 underline-offset-2 hover:underline">See regional analytics</Link>.</p>
      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Seats by region"><CompareChart title={`Approved intake against seats filled by region, ${ay}`} rows={byRegion.map((r) => ({ label: r.label, intake: r.intake, ordinary: r.ordinary, supernumerary: r.supernumerary }))} caption="Only institutions that have submitted. Red marks a region above its approved intake in total." /></Panel>
        <Panel title="Seats by programme"><CompareChart title={`Approved intake against seats filled by programme, ${ay}`} rows={byProgramme.map((r) => ({ label: r.label, intake: r.intake, ordinary: r.ordinary, supernumerary: r.supernumerary }))} caption="Programme codes combined across institutions." /></Panel>
      </div>
      <Panel title="Every programme" description="Search, filter and sort. Red rows are above approved intake." flush><LedgerTable rows={rows} ay={ay} /></Panel>
    </>
  );
}
