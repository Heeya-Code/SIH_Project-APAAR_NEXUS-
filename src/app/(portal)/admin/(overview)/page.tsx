// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import Link from "next/link";
import { AlertTriangle, Building2, Layers, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Panel, StatCard } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { ROLE_META } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { dateTime, fmt } from "@/lib/format";
import { verifyAuditChain } from "@/lib/audit";
import { ControlsChecklist, MaskingRules, RoleMatrix, type Control } from "@/components/governance";

export const metadata = { title: "Platform overview" };
export const dynamic = "force-dynamic";

export default async function PlatformOverview() {
  await requirePermission("users:manage");
  const [users, insts, sessions, openConflicts, openAlerts, pending, byRole, recent, denied24] = await Promise.all([
    db.user.count({ where: { isActive: true } }), db.institution.count(), db.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    db.duplicateAlert.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }), db.anomalyAlert.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    db.institution.count({ where: { submissions: { none: { academicYear: "2026-27", OR: [{ acceptedAt: { not: null } }, { submittedAt: { not: null } }] } } } }),
    db.user.groupBy({ by: ["role"], where: { isActive: true }, _count: true }), db.auditLog.findMany({ orderBy: { seq: "desc" }, take: 8 }),
    db.auditLog.count({ where: { outcome: "DENIED", createdAt: { gt: new Date(Date.now() - 864e5) } } }),
  ]);
  const [chain, unencrypted, credsWithoutConsent] = await Promise.all([verifyAuditChain(), db.studentIdentity.count({ where: { NOT: { fullNameEnc: { startsWith: "v1:" } } } }), db.digitalCredential.count({ where: { consentRequest: null } })]);
  const controls: Control[] = [
    { label: "Audit trail is intact", ok: chain.ok, note: chain.ok ? `${chain.checked.toLocaleString("en-IN")} records verified against the hash chain just now.` : chain.reason ?? "Chain verification failed." },
    { label: "Student personal data is encrypted at rest", ok: unencrypted === 0, note: unencrypted === 0 ? "Every name, date of birth and APAAR ID is stored with AES-256-GCM." : `${unencrypted} identity records are not encrypted.` },
    { label: "No verification record exists without consent", ok: credsWithoutConsent === 0, note: credsWithoutConsent === 0 ? "Every signed record is tied to a student's approval." : `${credsWithoutConsent} signed record(s) have no consent request. Verifiers cannot open them, but they should be investigated.` },
    { label: "Sessions are server-side and revocable", ok: true, note: "Signing out, revoking or deactivating takes effect on the next request." },
    { label: "Abuse controls are active", ok: true, note: "Rate limits on sign-in, upload, consent requests, lookups and password resets." },
    { label: "Open alerts have been reviewed", ok: openAlerts === 0 && openConflicts === 0, note: openAlerts + openConflicts ? `${openAlerts} alerts and ${openConflicts} conflicts still open.` : "Nothing is waiting for review." },
    { label: "Demonstration mode is off", ok: process.env.DEMO_MODE !== "true", note: process.env.DEMO_MODE === "true" ? "Demo accounts and the demo reset are enabled. Turn DEMO_MODE off for real use." : "Demo shortcuts are disabled." },
    { label: "A dedicated signing key is configured", ok: !!process.env.CREDENTIAL_SIGNING_SEED, note: process.env.CREDENTIAL_SIGNING_SEED ? "Verification records use their own key." : "The signing key is derived from the encryption key. Set CREDENTIAL_SIGNING_SEED for real use." },
  ];
  const roleCounts = Object.fromEntries(byRole.map((r) => [r.role, r._count]));
  return (
    <>
      <PageHeader title="Platform overview" subtitle="A summary of who uses the platform, what needs attention, and recent security activity." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Building2} label="Institutions" value={fmt(insts)} hint={`${pending} have not submitted 2026-27`} />
        <StatCard icon={Users} tone="teal" label="Active accounts" value={fmt(users)} hint={`${sessions} signed in now`} />
        <StatCard icon={AlertTriangle} tone={openConflicts ? "amber" : "green"} label="Open conflicts" value={fmt(openConflicts)} hint="Cross-institution, awaiting review" />
        <StatCard icon={Layers} tone={openAlerts ? "amber" : "green"} label="Open alerts" value={fmt(openAlerts)} hint="Anomaly alerts awaiting review" />
        <StatCard icon={ShieldCheck} tone={denied24 ? "amber" : "green"} label="Access denials, 24 h" value={fmt(denied24)} hint="Blocked attempts, all audited" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Accounts by role" description="Active accounts only." flush>
          <Table><TableBody>{byRole.sort((a, b) => b._count - a._count).map((r) => <TableRow key={r.role}><TableCell>{ROLE_META[r.role].label}</TableCell><TableCell className="tnum text-right">{r._count}</TableCell></TableRow>)}</TableBody></Table>
          <div className="border-t border-line px-5 py-3 text-sm"><Link href="/admin/users" className="text-blue-600 underline-offset-2 hover:underline">Manage users and sessions</Link></div>
        </Panel>
        <Panel title="Recent activity" aside={<Link href="/audit" className="text-blue-600 underline-offset-2 hover:underline">Open the audit trail</Link>} flush>
          <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader>
            <TableBody>{recent.map((r) => <TableRow key={r.seq.toString()}><TableCell className="whitespace-nowrap text-slate-600">{dateTime(r.createdAt)}</TableCell><TableCell className="capitalize">{r.action.toLowerCase().replaceAll("_", " ")}</TableCell><TableCell><Badge tone={r.outcome === "SUCCESS" ? "green" : r.outcome === "DENIED" ? "amber" : "red"} dot>{r.outcome.toLowerCase()}</Badge></TableCell></TableRow>)}</TableBody></Table>
        </Panel>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><RoleMatrix counts={roleCounts} /><MaskingRules /></div>
      <div className="mt-4"><ControlsChecklist controls={controls} /></div>
    </>
  );
}
