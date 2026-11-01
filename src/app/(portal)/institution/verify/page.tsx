// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { FlaskConical } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";
import { requirePermission } from "@/lib/auth/guards";
import { providerInfo } from "@/lib/verification/service";
import { MOCK_TEST_IDS } from "@/lib/verification/mock-provider";
import { VerifyForm } from "./verify-form";

export const metadata = { title: "Check an APAAR ID" };
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  await requirePermission("verification:apaar");
  const p = providerInfo();
  return (
    <>
      <PageHeader title="Check an APAAR ID" subtitle="Ask the verification provider whether an APAAR ID exists and, optionally, whether a name and date of birth match it." />
      <div className="fade-up mb-6 flex items-start gap-3 rounded-card border border-amber-600/25 bg-amber-100/70 px-4 py-3 text-sm text-navy-900">
        <FlaskConical className="mt-0.5 size-[18px] shrink-0 text-amber-700" aria-hidden />
        <p><strong className="font-medium">{p.mode === "MOCK" ? "Mock provider active." : p.mode === "NONE" ? "No provider configured." : "Live provider active."}</strong>{" "}
        {p.mode === "MOCK" && "Answers come from this prototype’s synthetic records. This page is not connected to the real APAAR system and its results are not authoritative."}</p>
      </div>
      <VerifyForm />
      {p.mode === "MOCK" && (
        <Panel title="Try the simulated cases" className="mt-6">
          <p className="mb-3 text-sm text-slate-600">Real IDs of your own students are available from the Students page (Reveal). These reserved IDs exercise the other outcomes:</p>
          <ul className="space-y-1 text-sm"><li><span className="font-mono">{MOCK_TEST_IDS.PENDING}</span> returns PENDING</li><li><span className="font-mono">{MOCK_TEST_IDS.PROVIDER_ERROR}</span> returns UNAVAILABLE (provider error)</li><li><span className="font-mono">{MOCK_TEST_IDS.TIMEOUT}</span> returns UNAVAILABLE (timeout after 5 seconds)</li></ul>
        </Panel>
      )}
    </>
  );
}
