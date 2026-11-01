// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { PageHeader, Panel } from "@/components/ui";
import { InstitutionsTable } from "@/components/institutions-table";
import { YearSwitcher } from "@/components/year-switcher";
import { requirePermission } from "@/lib/auth/guards";
import { getNationalSnapshot } from "@/lib/queries/national";
import { institutionTableRows } from "@/lib/queries/table-rows";
import { loadTrust } from "@/lib/trust/service";
import { CURRENT_AY, isValidAY } from "@/lib/years";

export const metadata = { title: "Institution directory" };
export const dynamic = "force-dynamic";

export default async function Directory({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requirePermission("national:view");
  const { ay: q } = await searchParams, ay = isValidAY(q) ? q : CURRENT_AY;
  const [snap, { rows }] = await Promise.all([getNationalSnapshot(user, ay), loadTrust()]);
  return (
    <>
      <PageHeader title="Institution directory" subtitle={`${snap.institutions.length} approved institutions in your scope. Search by name, city or state, sort any column, and open an institution for its seat ledger, Trust Score and alerts.`} actions={<YearSwitcher basePath="/aicte/institutions" current={ay} />} />
      <Panel flush><InstitutionsTable data={institutionTableRows(snap, rows, ay)} /></Panel>
    </>
  );
}
