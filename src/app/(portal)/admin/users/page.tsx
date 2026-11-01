// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { ROLE_META } from "@/lib/auth/permissions";
import { dateTime } from "@/lib/format";
import { listUsersWithSessions } from "@/lib/queries/admin";
import { UserActions } from "./user-actions";

export const metadata = { title: "Users & access" };
export const dynamic = "force-dynamic";
const initials = (n: string) => n.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export default async function Admin() {
  const me = await requirePermission("users:manage");
  const users = await listUsersWithSessions();
  return (
    <>
      <PageHeader title="Users and access" subtitle="Revoking sessions signs a user out immediately. Deactivating an account also blocks future sign-in. Both actions are audited." />
      <Panel title={`${users.length} accounts`} flush>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Account</TableHead><TableHead>Role</TableHead><TableHead>Scope</TableHead><TableHead>Last sign-in</TableHead><TableHead className="text-right">Sessions</TableHead><TableHead>State</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell><div className="flex items-center gap-3"><span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{initials(u.name)}</span><div className="min-w-0"><p className="text-navy-900">{u.name}</p><p className="font-mono text-xs text-slate-500">{u.email}</p></div></div></TableCell>
                <TableCell>{ROLE_META[u.role].label}</TableCell><TableCell className="text-slate-600">{u.scope}</TableCell>
                <TableCell className="text-slate-600">{u.lastLoginAt ? dateTime(u.lastLoginAt) : "Never"}</TableCell>
                <TableCell className="tnum text-right">{u.activeSessions}</TableCell>
                <TableCell>{!u.isActive ? <Badge tone="red" dot>Deactivated</Badge> : u.locked ? <Badge tone="amber" dot>Locked</Badge> : <Badge tone="green" dot>Active</Badge>}</TableCell>
                <TableCell><UserActions userId={u.id} name={u.name} isActive={u.isActive} sessions={u.activeSessions} self={u.id === me.id} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}
