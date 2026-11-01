// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { FIELDS, type FieldKey } from "@/lib/credentials/claims";
import { dateTime } from "@/lib/format";
import { getConsentRequests } from "@/lib/queries/student";
import { RevokeButton } from "../qr/revoke-button";

export const metadata = { title: "Consent history" };
export const dynamic = "force-dynamic";
const ST: Record<string, { label: string; tone: "green" | "red" | "amber" | "neutral" | "blue" }> = { PENDING: { label: "Waiting for you", tone: "amber" }, APPROVED: { label: "Approved", tone: "green" }, REJECTED: { label: "Declined", tone: "red" }, EXPIRED: { label: "Expired", tone: "neutral" }, REVOKED: { label: "Withdrawn", tone: "red" } };
const names = (v: unknown) => (Array.isArray(v) ? (v as string[]).map((k) => FIELDS[k as FieldKey]?.label ?? k) : []);

export default async function Consents() {
  const user = await requirePermission("consent:decide");
  const log = await getConsentRequests(user);
  return (
    <>
      <PageHeader title="Consent history" subtitle="A permanent record of every request: who asked, why, what they wanted, what you shared, and what happened. Only you and platform auditors can see it." />
      <Panel flush={log.length > 0} title={`${log.length} request${log.length === 1 ? "" : "s"}`}>
        {log.length === 0 ? <Empty icon={ClipboardList} title="No requests yet">When someone asks to verify you, the request and your decision will be listed here.</Empty> : (
          <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Reference</TableHead><TableHead>Requester and purpose</TableHead><TableHead>Asked for</TableHead><TableHead>You shared</TableHead><TableHead>Decision</TableHead><TableHead>When</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{log.map((c) => { const st = ST[c.status]; return (
              <TableRow key={c.id}><TableCell className="font-mono text-xs">{c.reference}</TableCell><TableCell><p className="text-navy-900">{c.verifierOrg}</p><p className="text-xs text-slate-500">{c.purpose}</p></TableCell>
                <TableCell className="max-w-[200px] text-[13px] text-slate-600">{names(c.requestedFields).join(", ")}</TableCell><TableCell className="max-w-[200px] text-[13px] text-slate-600">{c.approvedFields ? names(c.approvedFields).join(", ") : <span className="text-slate-500">Nothing</span>}</TableCell>
                <TableCell><Badge tone={st.tone} dot>{st.label}</Badge>{c.decisionNote && <p className="mt-1 max-w-[180px] text-xs text-slate-500">&ldquo;{c.decisionNote}&rdquo;</p>}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-600"><p>Asked {dateTime(c.createdAt)}</p>{c.decidedAt && <p>Decided {dateTime(c.decidedAt)}</p>}{c.validUntil && <p>Valid until {dateTime(c.validUntil)}</p>}{c.revokedAt && <p>Withdrawn {dateTime(c.revokedAt)}</p>}</TableCell>
                <TableCell>{c.status === "APPROVED" && <RevokeButton id={c.id} reference={c.reference} />}</TableCell></TableRow>); })}</TableBody></Table>
        )}
      </Panel>
    </>
  );
}
