// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { CircleCheck, EyeOff, Hourglass, KeyRound, Lock, ScanLine, ScrollText, SendHorizontal, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, PageHeader, Panel, StatCard } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { expireStale } from "@/lib/consent/service";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Verification dashboard" };
export const dynamic = "force-dynamic";
const TONE = { VALID: "green", EXPIRED: "neutral", REVOKED: "red", NOT_FOUND: "amber", SIGNATURE_INVALID: "red", CONSENT_DENIED: "amber" } as const;
const LABEL: Record<string, string> = { VALID: "Valid", EXPIRED: "Expired", REVOKED: "Withdrawn", NOT_FOUND: "Not found", SIGNATURE_INVALID: "Altered", CONSENT_DENIED: "Not permitted" };

export default async function VerifierHome() {
  const user = await requirePermission("verifier:use");
  await expireStale({ verifierUserId: user.id });
  const [reqs, checks, recent] = await Promise.all([db.consentRequest.groupBy({ by: ["status"], where: { verifierUserId: user.id }, _count: true }), db.verificationRequest.groupBy({ by: ["result"], where: { verifierUserId: user.id }, _count: true }), db.verificationRequest.findMany({ where: { verifierUserId: user.id }, orderBy: { createdAt: "desc" }, take: 6 })]);
  const n = (s: string) => reqs.find((r) => r.status === s)?._count ?? 0, valid = checks.find((c) => c.result === "VALID")?._count ?? 0;
  return (
    <>
      <PageHeader title="Verification dashboard" subtitle={`Signed in for ${user.organisation ?? "your organisation"}. You can confirm an enrolment only with the student's consent, and you see only what they approve.`}
        actions={<><Button asChild><Link href="/verifier/new"><SendHorizontal aria-hidden />New request</Link></Button><Button asChild variant="secondary"><Link href="/verifier/check"><ScanLine aria-hidden />Scan or enter a code</Link></Button></>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Hourglass} tone="amber" label="Waiting for the student" value={n("PENDING")} hint="Requests not yet answered." />
        <StatCard icon={CircleCheck} tone="green" label="Approved" value={n("APPROVED")} hint="Ask the student for their QR code or code." />
        <StatCard icon={ShieldX} tone="red" label="Declined or withdrawn" value={n("REJECTED") + n("REVOKED")} hint="The student chose not to share, or withdrew consent." />
        <StatCard icon={ScanLine} tone="teal" label="Valid verifications" value={valid} hint={`${checks.reduce((t, c) => t + c._count, 0)} lookups in total.`} />
      </div>
      <Panel title="Privacy preserving controls" description="These protections are built in and cannot be switched off." className="mb-6">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {([[EyeOff, "Masked data", "APAAR IDs and dates of birth are never shown to you."], [Lock, "Data sharing controls", "The student approves each detail, one by one."], [KeyRound, "Access control", "Only the organisation that asked can open an approved record."], [ScrollText, "Audit trail", "Every request and lookup is recorded and tamper-evident."]] as const).map(([Icon, t, d]) => (
            <li key={t} className="flex gap-3 rounded-control border border-line bg-paper/60 p-3.5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700"><Icon className="size-[18px]" aria-hidden /></span><div><p className="flex items-center gap-1.5 text-sm font-medium text-navy-900">{t}<CircleCheck className="size-3.5 text-green-600" aria-hidden /></p><p className="mt-0.5 text-xs text-slate-600">{d}</p></div></li>))}
        </ul>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="How it works"><ol className="space-y-3 text-sm text-slate-700">{["Ask the student for their verification code.", "Send a request that says why you need the information and exactly which details.", "The student approves some or all of it, or declines.", "Scan their QR code or enter their verification code to see the result."].map((t, i) => <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white">{i + 1}</span><span className="pt-0.5">{t}</span></li>)}</ol>
          <p className="mt-4 text-xs text-slate-500">You cannot browse students or institutions. This prototype uses synthetic records and a simulated registry.</p></Panel>
        <Panel title="Recent lookups" flush={recent.length > 0} aside={<Link href="/verifier/history" className="text-blue-600 underline-offset-2 hover:underline">All history</Link>}>
          {recent.length === 0 ? <Empty icon={ScanLine} title="No lookups yet">Results of codes you scan or enter appear here.</Empty> : (
            <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>When</TableHead><TableHead>Code</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
              <TableBody>{recent.map((h) => <TableRow key={h.id}><TableCell className="whitespace-nowrap text-slate-600">{dateTime(h.createdAt)}</TableCell><TableCell className="font-mono text-xs">{h.credentialIdQuery}</TableCell><TableCell><Badge tone={TONE[h.result]} dot>{LABEL[h.result]}</Badge></TableCell></TableRow>)}</TableBody></Table>)}
        </Panel>
      </div>
    </>
  );
}
