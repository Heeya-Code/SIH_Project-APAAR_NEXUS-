// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { PageHeader } from "@/components/ui";
import { TrustView } from "@/components/trust-view";
import { YearSwitcher } from "@/components/year-switcher";
import { requirePermission } from "@/lib/auth/guards";
import { loadTrust } from "@/lib/trust/service";
import { ACADEMIC_YEARS, isValidAY } from "@/lib/years";

export const metadata = { title: "Trust score" };
export const dynamic = "force-dynamic";

export default async function InstitutionTrust({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requirePermission("trust:view:own");
  const { rows, weights } = await loadTrust();
  const id = user.institutionId!;
  const trend = ACADEMIC_YEARS.map((ay) => { const r = rows.get(`${id}|${ay}`)!.result; return { ay, overall: r.scored ? r.overall : null }; });
  const { ay: q } = await searchParams;
  const ay = isValidAY(q) ? q : [...ACADEMIC_YEARS].reverse().find((y) => rows.get(`${id}|${y}`)!.result.scored) ?? ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1];
  return (
    <>
      <PageHeader title="Your Trust Score" subtitle="How reliable your submitted data looks, and exactly what would improve it." actions={<YearSwitcher basePath="/institution/trust" current={ay} />} />
      <TrustView ay={ay} result={rows.get(`${id}|${ay}`)!.result} trend={trend} weightSource={weights.source === "default" ? "documented defaults" : "set by this installation"} />
    </>
  );
}
