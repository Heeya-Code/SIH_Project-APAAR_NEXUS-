// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { FIELDS, type FieldKey } from "@/lib/credentials/claims";
import { expireStale } from "@/lib/consent/service";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Request history" };
export const dynamic = "force-dynamic";
const ST: Record<string, { label: string; tone: "green" | "red" | "amber" | "neutral" }> = { PENDING: { label: "Waiting for the student", tone: "amber" }, APPROVED: { label: "Approved", tone: "green" }, REJECTED: { label: "Declined", tone: "red" }, EXPIRED: { label: "Expired", tone: "neutral" }, REVOKED: { label: "Withdrawn", tone: "red" } };
const RES: Record<string, { label: string; tone: "green" | "red" | "amber" | "neutral" }> = { VALID: { label: "Valid", tone: "green" }, EXPIRED: { label: "Expired", tone: "neutral" }, REVOKED: { label: "Withdrawn", tone: "red" }, NOT_FOUND: { label: "Not found", tone: "amber" }, SIGNATURE_INVALID: { label: "Altered", tone: "red" }, CONSENT_DENIED: { label: "Not permitted", tone: "amber" } };
const names = (v: unknown) => (Array.isArray(v) ? (v as string[]).map((k) => FIELDS[k as FieldKey]?.label ?? k).join(", ") : "");

export default async function History_() {
  const user = await requirePermission("verifier:use");
  await expireStale({ verifierUserId: user.id });
  const [reqs, lookups] = await Promise.all([db.consentRequest.findMany({ where: { verifierUserId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }), db.verificationRequest.findMany({ where: { verifierUserId: user.id }, orderBy: { createdAt: "desc" }, take: 100 })]);
  return (
    <>
      <PageHeader title="Request history" subtitle="Everything you have asked and everything you have looked up. Student names are never shown here." />
      <Panel title="Your requests" className="mb-6" flush={reqs.length > 0}>
        {reqs.length === 0 ? <Empty icon={History} title="No requests yet">Send a request from New request.</Empty> : (
          <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Reference</TableHead><TableHead>Purpose</TableHead><TableHead>You asked for</TableHead><TableHead>Student shared</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead></TableRow></TableHeader>
            <TableBody>{reqs.map((r) => <TableRow key={r.id}><TableCell className="font-mono text-xs">{r.reference}</TableCell><TableCell>{r.purpose}</TableCell><TableCell className="max-w-[220px] text-[13px] text-slate-600">{names(r.requestedFields)}</TableCell><TableCell className="max-w-[220px] text-[13px] text-slate-600">{r.approvedFields ? names(r.approvedFields) : "-"}</TableCell>
              <TableCell><Badge tone={ST[r.status].tone} dot>{ST[r.status].label}</Badge>{r.status === "APPROVED" && <p className="mt-1 text-xs text-slate-500">Ask the student for their QR or code</p>}{r.decisionNote && <p className="mt-1 text-xs text-slate-500">&ldquo;{r.decisionNote}&rdquo;</p>}</TableCell><TableCell className="whitespace-nowrap text-xs text-slate-600">{dateTime(r.createdAt)}</TableCell></TableRow>)}</TableBody></Table>
        )}
      </Panel>
      <Panel title="Your lookups" flush={lookups.length > 0}>
        {lookups.length === 0 ? <Empty icon={History} title="No lookups yet">Codes you scan or enter are listed here with their result.</Empty> : (
          <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>When</TableHead><TableHead>Code</TableHead><TableHead>How</TableHead><TableHead>Result</TableHead><TableHead>Details you saw</TableHead></TableRow></TableHeader>
            <TableBody>{lookups.map((h) => <TableRow key={h.id}><TableCell className="whitespace-nowrap text-slate-600">{dateTime(h.createdAt)}</TableCell><TableCell className="font-mono text-xs">{h.credentialIdQuery}</TableCell><TableCell>{h.method === "QR_SCAN" ? "QR scan" : "Typed code"}</TableCell><TableCell><Badge tone={RES[h.result].tone} dot>{RES[h.result].label}</Badge></TableCell><TableCell className="text-[13px] text-slate-600">{names(h.disclosedFields) || "-"}</TableCell></TableRow>)}</TableBody></Table>
        )}
      </Panel>
    </>
  );
}
