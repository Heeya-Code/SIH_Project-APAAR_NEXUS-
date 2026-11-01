// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Image 10's governance panels, generated from the real permission table and real checks, never from hand-typed claims.
import { CircleAlert, CircleCheck } from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { Badge, type Tone } from "@/components/ui/badge";
import { Panel } from "@/components/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_META, ROLE_PERMISSIONS } from "@/lib/auth/permissions";

const ROLES = Object.keys(ROLE_PERMISSIONS) as Role[];
type Level = { label: string; tone: Tone };
function levels(role: Role): { records: Level; apaar: Level; audit: Level; consent: Level } {
  const p = new Set(ROLE_PERMISSIONS[role]);
  return {
    records: p.has("students:view") ? { label: "Own institution", tone: "amber" } : p.has("student:self") ? { label: "Own record", tone: "amber" } : p.has("national:view") ? { label: "Aggregate only", tone: "blue" } : p.has("verifier:use") ? { label: "Consented fields", tone: "teal" } : { label: "None", tone: "red" },
    apaar: p.has("students:reveal-apaar") ? { label: "Reveal, audited", tone: "amber" } : p.has("students:view") || p.has("student:self") ? { label: "Masked", tone: "blue" } : { label: "None", tone: "red" },
    audit: p.has("audit:view:all") ? { label: "Full", tone: "green" } : p.has("audit:view:institution") ? { label: "Own institution", tone: "amber" } : { label: "None", tone: "red" },
    consent: p.has("consent:decide") ? { label: "Decides", tone: "green" } : p.has("consent:request") ? { label: "Requests", tone: "teal" } : { label: "None", tone: "neutral" },
  };
}

export function RoleMatrix({ counts }: { counts: Partial<Record<Role, number>> }) {
  return (
    <Panel title="Role-based access control" description="Generated from the permission table the server enforces (src/lib/auth/permissions.ts)." flush>
      <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Role</TableHead><TableHead className="text-right">Users</TableHead><TableHead>Student records</TableHead><TableHead>APAAR IDs</TableHead><TableHead>Audit trail</TableHead><TableHead>Consent</TableHead></TableRow></TableHeader>
        <TableBody>{ROLES.map((r) => { const l = levels(r); return (
          <TableRow key={r}><TableCell><Badge tone="neutral">{ROLE_META[r].label}</Badge></TableCell><TableCell className="tnum text-right">{counts[r] ?? 0}</TableCell>
            {[l.records, l.apaar, l.audit, l.consent].map((x, i) => <TableCell key={i}><Badge tone={x.tone}>{x.label}</Badge></TableCell>)}</TableRow>); })}</TableBody></Table>
    </Panel>
  );
}

const MASKS: [string, string, string][] = [
  ["APAAR ID", "•••• •••• 7890", "Everyone, unless an institution admin presses Reveal (recorded)"],
  ["Date of birth", "never displayed", "Encrypted; used only for matching"],
  ["Student name", "encrypted at rest", "Own institution's staff and the student; a verifier only if approved"],
  ["Matching keys", "keyed hash", "Never shown to anyone"],
  ["QR code", "opaque code only", "Holds no personal data"],
  ["Audit metadata", "[REDACTED-ID]", "Identifiers are stripped before logging"],
];
export function MaskingRules() {
  return (
    <Panel title="Data masking rules" flush>
      <ul className="divide-y divide-line">{MASKS.map(([f, s, w]) => <li key={f} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"><span className="text-sm font-medium text-navy-900">{f}</span><code className="rounded-md border border-line bg-paper/60 px-2 py-0.5 font-mono text-[12px] text-slate-600">{s}</code><span className="w-full text-xs text-slate-500 sm:w-auto sm:max-w-[260px] sm:text-right">{w}</span></li>)}</ul>
    </Panel>
  );
}

export type Control = { label: string; ok: boolean; note: string };
export function ControlsChecklist({ controls }: { controls: Control[] }) {
  const passing = controls.filter((c) => c.ok).length;
  return (
    <Panel title="Privacy and security controls" description={`${passing} of ${controls.length} checks passing right now. Designed with DPDP Act 2023 principles in mind; not a legal compliance claim.`} flush>
      <ul className="divide-y divide-line">{controls.map((c) => (
        <li key={c.label} className="flex items-start gap-3 px-5 py-3">
          {c.ok ? <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-green-600" aria-hidden /> : <CircleAlert className="mt-0.5 size-[18px] shrink-0 text-amber-600" aria-hidden />}
          <div className="min-w-0 flex-1"><p className="text-sm text-navy-900">{c.label}</p><p className="text-xs text-slate-500">{c.note}</p></div>
          <span className={`text-xs font-medium ${c.ok ? "text-green-700" : "text-amber-700"}`}>{c.ok ? "Passing" : "Review"}</span>
        </li>))}</ul>
    </Panel>
  );
}
