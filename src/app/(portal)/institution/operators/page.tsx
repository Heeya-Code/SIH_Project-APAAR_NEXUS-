// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { OperatorForm } from "./operator-form";

export const metadata = { title: "Data operators" };
export const dynamic = "force-dynamic";

export default async function Operators() {
  const user = await requirePermission("operators:manage");
  const ops = await db.user.findMany({ where: { institutionId: user.institutionId!, role: "DATA_ENTRY_OPERATOR" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true } });
  return (
    <>
      <PageHeader title="Data operators" subtitle="Colleagues who prepare and upload student records for your institution. They can upload, review errors and resubmit, but cannot change settings or manage other people." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Add an operator" description="They sign in with the email below and the temporary password we show you once."><OperatorForm /></Panel>
        <Panel title={`${ops.length} operator${ops.length === 1 ? "" : "s"}`} flush={ops.length > 0}>
          {ops.length === 0 ? <Empty icon={UserCog} title="No operators yet">Add one on the left. They will see only your institution.</Empty> : (
            <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Last sign-in</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
              <TableBody>{ops.map((o) => <TableRow key={o.id}><TableCell className="text-navy-900">{o.name}</TableCell><TableCell className="font-mono text-xs">{o.email}</TableCell><TableCell className="text-slate-600">{o.lastLoginAt ? dateTime(o.lastLoginAt) : "Never"}</TableCell><TableCell>{o.isActive ? <Badge tone="green" dot>Active</Badge> : <Badge tone="red" dot>Deactivated</Badge>}</TableCell></TableRow>)}</TableBody></Table>
          )}
        </Panel>
      </div>
    </>
  );
}
