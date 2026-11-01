// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { REGION_LABEL } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { TYPE_LABEL } from "@/lib/format";
import { BAND_LABEL } from "@/lib/trust/score";
import { loadTrust } from "@/lib/trust/service";
import { CURRENT_AY } from "@/lib/years";

export const metadata = { title: "Institutions" };
export const dynamic = "force-dynamic";

export default async function AdminInstitutions() {
  await requirePermission("users:manage");
  const [insts, { rows }] = await Promise.all([db.institution.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true, students: true } }, submissions: { where: { academicYear: CURRENT_AY }, select: { status: true, version: true }, orderBy: { version: "desc" }, take: 1 } } }), loadTrust()]);
  return (
    <>
      <PageHeader title="Institutions" subtitle={`${insts.length} approved institutions on the platform. Open one for its seat ledger, Trust Score and alerts.`} />
      <Panel flush>
        <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Institution</TableHead><TableHead>Region</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Staff accounts</TableHead><TableHead className="text-right">Students</TableHead><TableHead>{CURRENT_AY} submission</TableHead><TableHead>Trust Score</TableHead></TableRow></TableHeader>
          <TableBody>{insts.map((i) => { const t = rows.get(`${i.id}|${CURRENT_AY}`)?.result, s = i.submissions[0]; return (
            <TableRow key={i.id}><TableCell><Link href={`/aicte/institutions/${i.id}`} className="font-medium text-blue-600 underline-offset-2 hover:underline">{i.name}</Link><p className="text-xs text-slate-500">{i.city}, {i.stateName}</p></TableCell>
              <TableCell>{REGION_LABEL[i.region]}</TableCell><TableCell>{TYPE_LABEL[i.type]}</TableCell><TableCell className="tnum text-right">{i._count.users}</TableCell><TableCell className="tnum text-right">{i._count.students.toLocaleString("en-IN")}</TableCell>
              <TableCell>{s ? <Badge tone={s.status === "ACCEPTED" ? "green" : "amber"} dot>{s.status === "ACCEPTED" ? `Accepted v${s.version}` : "Needs correction"}</Badge> : <Badge tone="amber" dot>Pending</Badge>}</TableCell>
              <TableCell>{t?.scored ? <span className="text-sm"><span className="num text-base text-navy-900">{t.overall}</span> <span className="text-xs text-slate-500">{BAND_LABEL[t.band]}</span></span> : <span className="text-xs text-slate-500">Not scored</span>}</TableCell></TableRow>); })}</TableBody></Table>
      </Panel>
    </>
  );
}
