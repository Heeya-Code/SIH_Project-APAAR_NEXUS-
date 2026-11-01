// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { dateTime } from "@/lib/format";
import { listAudit } from "@/lib/queries/admin";
import { redirect } from "next/navigation";
import { VerifyChain } from "./verify-chain";

export const metadata = { title: "Audit trail" };
export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const user = await requireUser();
  const all = can(user.role, "audit:view:all");
  if (!all && !can(user.role, "audit:view:institution")) {
    await audit({ actor: user, action: "ACCESS_DENIED", outcome: "DENIED", institutionId: user.institutionId, metadata: { permission: "audit:view" } });
    redirect("/forbidden");
  }
  const { action } = await searchParams;
  const { rows, actions } = await listAudit(user, { action: action?.slice(0, 60), limit: 100 });
  const chip = (active: boolean) => `whitespace-nowrap rounded-full border px-3 py-1 text-[13px] transition-colors ${active ? "border-navy-900 bg-navy-900 text-white" : "border-line-strong bg-white text-slate-600 hover:bg-paper"}`;
  return (
    <>
      <PageHeader title="Audit trail" subtitle={all ? "Every sign-in, access denial and sensitive action across the platform. Records cannot be edited or deleted." : "Events for your institution only."} actions={all ? <VerifyChain /> : undefined} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link href="/audit" className={chip(!action)}>All events</Link>
        {actions.map((a) => <Link key={a} href={`/audit?action=${encodeURIComponent(a)}`} className={chip(action === a)}>{a.toLowerCase().replaceAll("_", " ")}</Link>)}
      </div>
      <Panel title={`Latest ${rows.length} events`} flush>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead>#</TableHead><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>Outcome</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.seq}>
                <TableCell className="tnum text-slate-500">{r.seq}</TableCell><TableCell className="whitespace-nowrap text-slate-600">{dateTime(r.at)}</TableCell>
                <TableCell><span className="font-mono text-xs">{r.actor}</span></TableCell><TableCell className="capitalize">{r.action.toLowerCase().replaceAll("_", " ")}</TableCell>
                <TableCell><Badge tone={r.outcome === "SUCCESS" ? "green" : r.outcome === "DENIED" ? "amber" : "red"} dot>{r.outcome.toLowerCase()}</Badge></TableCell>
                <TableCell className="max-w-[360px]"><span className="block truncate font-mono text-xs text-slate-500" title={r.metadata ? JSON.stringify(r.metadata) : undefined}>{r.metadata ? JSON.stringify(r.metadata) : ""}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}
