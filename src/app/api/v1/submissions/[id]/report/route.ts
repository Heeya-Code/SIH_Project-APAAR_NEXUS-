// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
import { z } from "zod";
import { apiGet, fileResponse } from "@/lib/api/route";
import { fail } from "@/lib/api/respond";
import { audit } from "@/lib/audit";
import { correctionReportCsv } from "@/lib/queries/submissions";

export const dynamic = "force-dynamic";
/** GET /api/v1/submissions/{id}/report : the correction report as CSV (APAAR IDs masked). */
export const GET = apiGet({ permission: "submissions:view", handler: async ({ user, params, requestId }) => {
  const id = z.string().uuid().safeParse(params.id); if (!id.success) return fail("VALIDATION_FAILED", "Invalid submission.", 422, requestId);
  const csv = await correctionReportCsv(user, id.data); if (csv === null) return fail("NOT_FOUND", "That submission was not found.", 404, requestId);
  await audit({ actor: user, action: "CORRECTION_REPORT_DOWNLOADED", entityType: "DataSubmission", entityId: id.data, institutionId: user.institutionId });
  return fileResponse(csv, `correction-report-${id.data.slice(0, 8)}.csv`, "text/csv; charset=utf-8", requestId);
} });
