// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { requirePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { demoMode } from "@/lib/demo";
import { can } from "@/lib/auth/permissions";
import { CURRENT_AY } from "@/lib/years";
import { COLUMNS } from "@/lib/submissions/spec";
import { UploadWizard } from "./upload-wizard";

export const metadata = { title: "Upload centre" };
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await requirePermission("submissions:create");
  const programmes = await db.programme.findMany({ where: { institutionId: user.institutionId! }, orderBy: { code: "asc" }, select: { code: true, name: true } });
  return (
    <>
      <PageHeader title="Upload centre" subtitle="Send AICTE your student records in a few guided steps. We check the file first and tell you, row by row, anything that needs fixing. Nothing is stored as an enrolment until you press Submit." />
      <UploadWizard columns={COLUMNS} programmes={programmes} defaultYear={CURRENT_AY} canReset={demoMode() && can(user.role, "operators:manage")} />
    </>
  );
}
