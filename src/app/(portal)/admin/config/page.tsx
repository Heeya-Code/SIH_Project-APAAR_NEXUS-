// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyFact, PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { keys } from "@/lib/credentials/sign";
import { db } from "@/lib/db";
import { ALERT_YEARS } from "@/lib/analysis/service";
import { apaarPattern } from "@/lib/apaar/structure";
import { apaarRequired } from "@/lib/submissions/service";
import { demoMode } from "@/lib/demo";
import { COMPONENT_KEYS, DEFAULT_WEIGHTS, loadWeights } from "@/lib/trust/score";

export const metadata = { title: "Configuration" };
export const dynamic = "force-dynamic";
const LABEL: Record<string, string> = { completeness: "Identifier completeness", validity: "APAAR format validity", duplicates: "Duplicate records", intake: "Intake compliance", consistency: "Data consistency", timeliness: "Submission timeliness", conflicts: "Unresolved conflicts" };

export default async function Config() {
  await requirePermission("users:manage");
  const rules = await db.complianceRule.findMany({ orderBy: { code: "asc" } });
  const w = loadWeights(), k = keys();
  return (
    <>
      <PageHeader title="Configuration" subtitle="How this installation is set up. These values are read from environment variables and the rules table; they are shown here for transparency and cannot be edited from the screen." />
      <p className="mb-6 flex items-start gap-2 rounded-control bg-blue-100/60 px-4 py-3 text-[13px] text-navy-900"><Info className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden />Regulatory thresholds are illustrative prototype defaults. Confirm them against the current AICTE Approval Process Handbook before any regulatory use.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Platform settings"><dl>
          <KeyFact label="Demo mode" value={<Badge tone={demoMode() ? "amber" : "green"}>{demoMode() ? "On" : "Off"}</Badge>} />
          <KeyFact label="APAAR ID format" value={<code className="text-[13px]">{apaarPattern().source}</code>} hint="structural only" />
          <KeyFact label="APAAR ID required in uploads" value={<span className="text-base">{apaarRequired() ? "Yes" : "No"}</span>} />
          <KeyFact label="Alerts produced for" value={<span className="text-base">{ALERT_YEARS.join(", ")}</span>} />
          <KeyFact label="Verification provider" value={<span className="text-base">{(process.env.APAAR_VERIFICATION_PROVIDER ?? "mock").toLowerCase()}</span>} hint="simulated" />
          <KeyFact label="Signing key (public id)" value={<code className="text-[13px]">{k.keyId}</code>} hint="Ed25519" />
        </dl></Panel>
        <Panel title="Trust Score weights" description={`Source: ${w.source === "default" ? "documented defaults" : "TRUST_WEIGHTS_JSON"}. Must sum to 100.`}>
          {w.warning && <p className="mb-2 text-sm text-amber-700">{w.warning}</p>}
          <dl>{COMPONENT_KEYS.map((c) => <KeyFact key={c} label={LABEL[c]} value={`${w.weights[c]}%`} hint={w.weights[c] !== DEFAULT_WEIGHTS[c] ? `default ${DEFAULT_WEIGHTS[c]}%` : undefined} />)}</dl>
        </Panel>
      </div>
      <Panel title="Compliance rules" className="mt-4" flush>
        <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Rule</TableHead><TableHead>Setting</TableHead><TableHead>Severity</TableHead><TableHead>Provenance</TableHead></TableRow></TableHeader>
          <TableBody>{rules.map((r) => <TableRow key={r.id}><TableCell><p className="font-medium text-navy-900">{r.name}</p><p className="text-xs text-slate-500">{r.description}</p></TableCell><TableCell><code className="text-[12px] text-slate-600">{JSON.stringify(r.parameters)}</code></TableCell><TableCell><Badge tone={r.severity === "REQUIRES_REVIEW" ? "amber" : "blue"}>{r.severity.replace("_", " ").toLowerCase()}</Badge></TableCell><TableCell className="max-w-[280px] text-xs text-slate-500">{r.source}</TableCell></TableRow>)}</TableBody></Table>
      </Panel>
    </>
  );
}
