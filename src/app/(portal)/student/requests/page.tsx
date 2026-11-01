// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { FIELD_KEYS, FIELDS, type FieldKey } from "@/lib/credentials/claims";
import { dateTime } from "@/lib/format";
import { getConsentRequests } from "@/lib/queries/student";
import { DecisionForm } from "./decision-form";

export const metadata = { title: "Verification requests" };
export const dynamic = "force-dynamic";

export default async function Requests() {
  const user = await requirePermission("consent:decide");
  const pending = (await getConsentRequests(user)).filter((r) => r.status === "PENDING");
  return (
    <>
      <PageHeader title="Verification requests" subtitle="Someone is asking to confirm your enrolment. Nothing is shared unless you approve, and you choose exactly what." />
      {pending.length === 0 ? <Empty icon={Inbox} title="No requests waiting">When an employer or another body asks to verify you, it appears here. Your code on My profile is what they need to ask.</Empty> : (
        <ul className="space-y-4">{pending.map((r) => { const fields = (r.requestedFields as string[]).filter((f): f is FieldKey => (FIELD_KEYS as readonly string[]).includes(f)); return (
          <li key={r.id}><Card className="fade-up p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Who is asking</p><h2 className="font-serif text-xl text-navy-900">{r.verifierOrg}</h2></div><Badge tone="amber" dot>Waiting for you</Badge></div>
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3"><div><dt className="text-xs font-medium text-slate-500">Why they are asking</dt><dd className="mt-1 text-navy-900">{r.purpose}</dd></div><div><dt className="text-xs font-medium text-slate-500">Reference</dt><dd className="mt-1 font-mono text-[13px]">{r.reference}</dd></div><div><dt className="text-xs font-medium text-slate-500">Asked on</dt><dd className="mt-1">{dateTime(r.createdAt)}, lapses {dateTime(r.requestExpiresAt)}</dd></div></dl>
            <DecisionForm id={r.id} org={r.verifierOrg} fields={fields.map((k) => ({ key: k, label: FIELDS[k].label, plain: FIELDS[k].plain, personal: FIELDS[k].personal }))} />
          </Card></li>); })}</ul>
      )}
    </>
  );
}
