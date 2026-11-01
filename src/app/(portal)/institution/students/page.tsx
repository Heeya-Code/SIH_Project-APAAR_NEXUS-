// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { fmt } from "@/lib/format";
import { listInstitutionStudents } from "@/lib/queries/institution";
import { ACADEMIC_YEARS, isValidAY } from "@/lib/years";
import { RevealApaar } from "./reveal-apaar";

export const metadata = { title: "Students" };
export const dynamic = "force-dynamic";
const PAGE = 25;
const APAAR = ["WELL_FORMED", "MISSING", "INVALID_FORMAT"] as const;
const VTONE = { STRUCTURALLY_VALID: "green", PENDING: "amber", FLAGGED_DUPLICATE: "red", UNDER_REVIEW: "blue", REJECTED: "red" } as const;
const select = "mt-1.5 block h-9 rounded-control border border-line-strong bg-white px-3 text-sm text-navy-900";

export default async function Students({ searchParams }: { searchParams: Promise<{ ay?: string; programme?: string; apaar?: string; page?: string }> }) {
  const user = await requirePermission("students:view");
  const sp = await searchParams;
  const ay = isValidAY(sp.ay) ? sp.ay : "2025-26";
  const apaar = (APAAR as readonly string[]).includes(sp.apaar ?? "") ? sp.apaar : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const programmes = await db.programme.findMany({ where: { institutionId: user.institutionId! }, orderBy: { code: "asc" }, select: { id: true, code: true } });
  const programme = programmes.find((p) => p.id === sp.programme)?.id;
  const { total, rows } = await listInstitutionStudents(user, { ay, programmeId: programme, apaar, page, pageSize: PAGE });
  const canReveal = can(user.role, "students:reveal-apaar");
  const qs = (o: Record<string, string | undefined>) => { const p = new URLSearchParams(); const m = { ay, programme, apaar, ...o }; for (const [k, v] of Object.entries(m)) if (v) p.set(k, v); return `/institution/students?${p}`; };
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <PageHeader title="Students" subtitle={`Records for your institution only. APAAR IDs are masked${canReveal ? "; revealing one is recorded in the audit trail" : ". Your role cannot reveal full IDs"}.`} />
      <form className="mb-5 flex flex-wrap items-end gap-3 rounded-card border border-line bg-white p-4 shadow-card" method="get">
        <label className="text-[13px] text-slate-600">Academic year<select name="ay" defaultValue={ay} className={select}>{ACADEMIC_YEARS.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="text-[13px] text-slate-600">Programme<select name="programme" defaultValue={programme ?? ""} className={select}><option value="">All programmes</option>{programmes.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</select></label>
        <label className="text-[13px] text-slate-600">APAAR ID<select name="apaar" defaultValue={apaar ?? ""} className={select}><option value="">Any</option><option value="WELL_FORMED">Well-formed</option><option value="MISSING">Missing</option><option value="INVALID_FORMAT">Invalid format</option></select></label>
        <Button type="submit"><Filter aria-hidden />Apply filters</Button>
      </form>
      <Panel title={`${fmt(total)} student record${total === 1 ? "" : "s"}`} aside={`Page ${page} of ${pages}`} flush>
        {rows.length === 0 ? <div className="p-5"><Empty icon={UsersRound} title="No records match these filters">Try another year or clear a filter.</Empty></div> : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Student ID</TableHead><TableHead>Name</TableHead><TableHead>APAAR ID</TableHead><TableHead>Verification</TableHead><TableHead>Programme</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.enrolmentId}>
                  <TableCell className="font-mono text-[13px]">{r.localId}</TableCell><TableCell className="text-navy-900">{r.name}</TableCell>
                  <TableCell><span className="flex flex-wrap items-center gap-2">{canReveal ? <RevealApaar studentId={r.studentId} masked={r.apaarMasked} /> : <span className="font-mono text-[13px]">{r.apaarMasked}</span>}{r.apaarFormat === "INVALID_FORMAT" && <Badge tone="red">Invalid</Badge>}{r.apaarFormat === "MISSING" && <Badge tone="amber">Missing</Badge>}</span></TableCell>
                  <TableCell><Badge tone={VTONE[r.verification as keyof typeof VTONE]} dot>{r.verification.replace("_", " ").toLowerCase()}</Badge></TableCell>
                  <TableCell>{r.programme}</TableCell><TableCell>{r.category}</TableCell><TableCell className="capitalize text-slate-600">{r.status.toLowerCase()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          {page > 1 ? <Button asChild variant="secondary" size="sm"><Link href={qs({ page: String(page - 1) })}><ChevronLeft aria-hidden />Previous</Link></Button> : <span />}
          <span className="text-[13px] text-slate-500">{fmt((page - 1) * PAGE + (rows.length ? 1 : 0))}–{fmt((page - 1) * PAGE + rows.length)} of {fmt(total)}</span>
          {page < pages ? <Button asChild variant="secondary" size="sm"><Link href={qs({ page: String(page + 1) })}>Next<ChevronRight aria-hidden /></Link></Button> : <span />}
        </div>
      </Panel>
    </>
  );
}
