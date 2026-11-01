// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KeyFact, PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { REGION_LABEL, ROLE_META, ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";

export const metadata = { title: "My profile" };
export const dynamic = "force-dynamic";
const PLAIN: Record<Permission, string> = {
  "national:view": "See national and regional enrolment dashboards", "institution:view": "See your institution's dashboard", "students:view": "See your institution's student records (identifiers masked)", "students:reveal-apaar": "Reveal a full APAAR ID (every reveal is recorded)",
  "submissions:create": "Upload, correct and resubmit student data", "submissions:view": "See upload history and validation results", "audit:view:all": "Read the platform audit trail", "audit:view:institution": "Read your institution's audit history", "users:manage": "Manage accounts and sessions",
  "student:self": "See your own academic identity", "verifier:use": "Use the verification desk", "verification:apaar": "Check an APAAR ID with the (simulated) verification provider", "trust:view:own": "See your institution's Trust Score", "operators:manage": "Create data operators for your institution",
  "alerts:view": "See anomaly alerts and cross-institution conflicts", "alerts:review": "Record a review decision on an alert", "consent:request": "Ask a student for consent to verify their enrolment", "consent:decide": "Approve, decline or withdraw consent for your own record", "verification:check": "Resolve a verification code or QR", "reports:export": "Download reports for the data you can see",
};

export default async function Profile() {
  const user = await requireUser();
  const [u, sessions] = await Promise.all([db.user.findUniqueOrThrow({ where: { id: user.id }, select: { lastLoginAt: true, createdAt: true } }), db.session.count({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } } })]);
  const meta = ROLE_META[user.role];
  return (
    <>
      <PageHeader title="My profile" subtitle="Who you are signed in as, what you can do, and your sign-in activity." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Account"><dl>
          <KeyFact label="Name" value={<span className="text-base">{user.name}</span>} /><KeyFact label="Email" value={<span className="font-mono text-sm">{user.email}</span>} />
          <KeyFact label="Role" value={<Badge tone="blue">{meta.label}</Badge>} />
          <KeyFact label="Scope" value={<span className="text-base">{user.institutionName ?? (user.region ? `${REGION_LABEL[user.region]} region` : user.organisation ?? (user.role === "STUDENT" ? "Your own record only" : "National"))}</span>} />
          <KeyFact label="Last sign-in" value={<span className="text-base">{u.lastLoginAt ? dateTime(u.lastLoginAt) : "This is your first"}</span>} /><KeyFact label="Active sessions" value={sessions} hint="including this one" />
        </dl><p className="mt-3 text-xs text-slate-500">Demo accounts use synthetic data and a shared demonstration password. Passwords are never shown or stored in readable form.</p></Panel>
        <Panel title="What your role allows" description={meta.blurb}>
          <ul className="space-y-2">{ROLE_PERMISSIONS[user.role].map((p) => <li key={p} className="flex gap-2.5 text-sm text-slate-700"><Check className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />{PLAIN[p]}</li>)}</ul>
        </Panel>
      </div>
    </>
  );
}
