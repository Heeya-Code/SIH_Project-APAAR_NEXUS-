// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Panel } from "@/components/ui";
import { YearSwitcher } from "@/components/year-switcher";
import { requirePermission } from "@/lib/auth/guards";
import { institutionScope, REGION_LABEL } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { BAND_LABEL } from "@/lib/trust/score";
import { loadTrust } from "@/lib/trust/service";
import { CURRENT_AY, isValidAY } from "@/lib/years";

export const metadata = { title: "Trust scores" };
export const dynamic = "force-dynamic";
const TONE = { STRONG: "green", GOOD: "teal", WATCH: "amber", AT_RISK: "red" } as const;

export default async function TrustScores({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requirePermission("national:view");
  const { ay: q } = await searchParams, ay = isValidAY(q) ? q : CURRENT_AY;
  const [insts, { rows, weights }] = await Promise.all([db.institution.findMany({ where: institutionScope(user), select: { id: true, name: true, stateName: true, region: true } }), loadTrust()]);
  const list = insts.map((i) => ({ ...i, r: rows.get(`${i.id}|${ay}`)!.result })).sort((a, b) => (a.r.scored ? a.r.overall : 1000) - (b.r.scored ? b.r.overall : 1000));
  const scored = list.filter((x) => x.r.scored) as (typeof list[number] & { r: { scored: true; overall: number } })[];
  const avg = scored.length ? Math.round((scored.reduce((t, x) => t + x.r.overall, 0) / scored.length) * 10) / 10 : null;
  return (
    <>
      <PageHeader title="Institution Trust Scores" subtitle={<>A transparent <strong className="font-medium text-navy-900">prototype</strong> measure of how reliable each institution's submitted data looks for {ay}. It is not an AICTE accreditation, approval or rating. Lowest scores first, so attention goes where it is needed.</>}
        actions={<><YearSwitcher basePath="/aicte/trust" current={ay} /><Button asChild variant="secondary"><a href={`/api/v1/reports/trust?ay=${ay}`} download><Download aria-hidden />Export CSV</a></Button></>} />
      <p className="mb-5 text-[13px] text-slate-600">{scored.length} of {list.length} institutions scored{avg !== null ? `, average ${avg}` : ""}. Institutions with no accepted submission are not scored rather than scored zero. Weights: {weights.source === "default" ? "documented defaults" : "set by this installation"}; see <Link href="/help" className="text-blue-600 underline-offset-2 hover:underline">Help</Link> for the formula.</p>
      <Panel flush>
        <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Institution</TableHead><TableHead>Region</TableHead><TableHead className="text-right">Score</TableHead><TableHead>Band</TableHead><TableHead>Biggest factor</TableHead></TableRow></TableHeader>
          <TableBody>{list.map((x) => { const worst = x.r.scored ? [...x.r.components].sort((a, b) => b.pointsLost - a.pointsLost)[0] : null; return (
            <TableRow key={x.id}><TableCell><Link href={`/aicte/institutions/${x.id}?ay=${ay}`} className="font-medium text-blue-600 underline-offset-2 hover:underline">{x.name}</Link><p className="text-xs text-slate-500">{x.stateName}</p></TableCell><TableCell>{REGION_LABEL[x.region]}</TableCell>
              <TableCell className="text-right">{x.r.scored ? <span className="num text-lg text-navy-900">{x.r.overall}</span> : <span className="text-xs text-slate-500">Not scored</span>}</TableCell>
              <TableCell>{x.r.scored ? <Badge tone={TONE[x.r.band]} dot>{BAND_LABEL[x.r.band]}</Badge> : <span className="text-xs text-slate-500">{x.r.reason}</span>}</TableCell>
              <TableCell className="max-w-[320px] text-[13px] text-slate-600">{worst && worst.pointsLost >= 0.5 ? <>{worst.label}: <span className="text-red-700">−{worst.pointsLost}</span> points</> : x.r.scored ? "Nothing lowered the score" : ""}</TableCell></TableRow>); })}</TableBody></Table>
      </Panel>
    </>
  );
}
